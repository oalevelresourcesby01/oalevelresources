package com.oalevel.resources.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.oalevel.resources.data.local.ChatMessageEntity
import com.oalevel.resources.data.repository.AiRepository
import com.oalevel.resources.data.repository.ChatHistoryRepository
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.util.UUID
import javax.inject.Inject

data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: String, // "user" | "assistant"
    val content: String,
    val attachmentName: String? = null,
    val attachmentType: String? = null, // "image" | "file"
    val imagePreviewUri: Uri? = null,
    val createdAt: Long = System.currentTimeMillis()
)

data class AiAttachment(
    val type: String,            // "image" | "file"
    val displayName: String,
    val imageBase64: String? = null,
    val pdfText: String? = null,
    val previewUri: Uri? = null,
    val isExtracting: Boolean = false,
    val extractionProgress: Float = 0f   // 0→1 while isExtracting, shown as percentage
)

data class AiChatUiState(
    val messages: List<ChatMessage> = emptyList(),
    val inputText: String = "",
    val isSending: Boolean = false,
    val error: String? = null,
    val sessionId: String = UUID.randomUUID().toString(),
    val attachment: AiAttachment? = null,
    // The most recently uploaded document, kept for the whole conversation
    // (until cleared or the session is reset) so follow-up questions like
    // "what's on page 12?" don't require re-uploading the file, and the PDF
    // is only ever parsed once rather than on every question.
    val activeDocument: AiAttachment? = null,
    // Same idea as [activeDocument] but for the last attached image — per
    // product spec, images should "remain available during the current
    // conversation" (diagrams, handwritten notes, graphs, etc.), not just
    // for the single turn they were attached on.
    val activeImage: AiAttachment? = null,
    // The last user turn (text + attachment) that failed to send, kept so
    // the UI can offer a one-tap "Retry" action instead of forcing retyping.
    val lastFailedTurn: PendingTurn? = null
)

data class PendingTurn(
    val displayText: String,
    val attachment: AiAttachment?
)

@HiltViewModel
class AiChatViewModel @Inject constructor(
    private val aiRepository: AiRepository,
    private val chatHistoryRepository: ChatHistoryRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(AiChatUiState())
    val uiState: StateFlow<AiChatUiState> = _uiState.asStateFlow()

    companion object {
        // Stay safely under the server's 200k-char cap while still covering
        // documents with hundreds of pages.
        private const val MAX_PDF_CHARS = 190_000
        private const val MAX_PDF_PAGES = 400
    }

    init {
        restoreSession()
    }

    /** Restore the most recent chat session from local storage, if any. */
    private fun restoreSession() {
        viewModelScope.launch {
            val lastSessionId = chatHistoryRepository.getLastSessionId() ?: return@launch
            val saved = chatHistoryRepository.getMessages(lastSessionId)
            if (saved.isNotEmpty()) {
                _uiState.update {
                    it.copy(
                        sessionId = lastSessionId,
                        messages = saved.map { entity ->
                            ChatMessage(
                                id = entity.id,
                                role = entity.role,
                                content = entity.content,
                                attachmentName = entity.attachmentName,
                                attachmentType = entity.attachmentType,
                                imagePreviewUri = entity.imagePreviewUri?.let(Uri::parse),
                                createdAt = entity.createdAt
                            )
                        }
                    )
                }
            }
        }
    }

    private fun persistMessage(sessionId: String, message: ChatMessage) {
        viewModelScope.launch {
            chatHistoryRepository.saveMessage(
                ChatMessageEntity(
                    id = message.id,
                    sessionId = sessionId,
                    role = message.role,
                    content = message.content,
                    attachmentName = message.attachmentName,
                    attachmentType = message.attachmentType,
                    imagePreviewUri = message.imagePreviewUri?.toString(),
                    createdAt = message.createdAt
                )
            )
        }
    }

    fun onInputChange(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun onImageAttached(base64: String, fileName: String, previewUri: Uri) {
        _uiState.update {
            it.copy(
                attachment = AiAttachment(
                    type = "image",
                    displayName = fileName,
                    imageBase64 = base64,
                    previewUri = previewUri
                )
            )
        }
    }

    /**
     * Attach a PDF/document.  Strategy:
     *  1. Try PDFBox text extraction across the WHOLE document (up to
     *     MAX_PDF_PAGES), with per-page markers so the AI can answer
     *     "what's on page N" and other page-specific questions, and so
     *     page order is always preserved.
     *  2. If the extracted text is sparse (< 120 chars, i.e. scanned/image-only PDF),
     *     render the first page with Android's PdfRenderer at 1.5× scale and send it
     *     as a base-64 JPEG image so the vision model can read diagrams, handwriting
     *     and typeset formulas that PDFBox cannot extract.
     *  3. Otherwise send the plain text (capped at MAX_PDF_CHARS).
     *
     * The parsed result is cached in [AiChatUiState.activeDocument] once sent,
     * so it stays part of the conversation for follow-up questions without
     * ever being re-parsed.
     */
    fun onFileAttached(fileName: String, uri: Uri) {
        _uiState.update {
            it.copy(
                attachment = AiAttachment(
                    type = "file",
                    displayName = fileName,
                    pdfText = null,
                    isExtracting = true,
                    extractionProgress = 0.05f
                )
            )
        }
        viewModelScope.launch {
            // ── Step 1: text extraction across the whole document ─────────────
            _uiState.update { s ->
                s.copy(attachment = s.attachment?.copy(extractionProgress = 0.2f))
            }
            val extracted = withContext(Dispatchers.IO) {
                runCatching {
                    PDFBoxResourceLoader.init(context)
                    context.contentResolver.openInputStream(uri)?.use { input ->
                        PDDocument.load(input).use { doc ->
                            val totalPages = minOf(doc.numberOfPages, MAX_PDF_PAGES)
                            val sb = StringBuilder()
                            val stripper = PDFTextStripper()
                            // Walk page-by-page (rather than one getText() call over
                            // the whole range) so we can insert page markers — this
                            // is what lets the AI answer "what's on page 12?" and
                            // keeps page order explicit and preserved.
                            for (page in 1..totalPages) {
                                stripper.startPage = page
                                stripper.endPage = page
                                val pageText = stripper.getText(doc).trim()
                                sb.append("\n\n--- Page ").append(page).append(" ---\n")
                                sb.append(pageText)
                                if (sb.length > MAX_PDF_CHARS) break
                                // Surface coarse progress for very long documents.
                                if (page % 10 == 0) {
                                    val frac = 0.2f + 0.3f * (page.toFloat() / totalPages)
                                    _uiState.update { s ->
                                        s.copy(attachment = s.attachment?.copy(extractionProgress = frac))
                                    }
                                }
                            }
                            sb.toString()
                        }
                    }
                }.getOrNull()
            }
            _uiState.update { s ->
                s.copy(attachment = s.attachment?.copy(extractionProgress = 0.5f))
            }

            val cleanText = extracted?.trim() ?: ""
            val hasRichText = cleanText.length >= 120

            if (hasRichText) {
                // ── Text-based PDF ───────────────────────────────────────────────
                _uiState.update { state ->
                    if (state.attachment?.displayName == fileName && state.attachment.type == "file") {
                        state.copy(attachment = state.attachment.copy(
                            pdfText = cleanText.take(MAX_PDF_CHARS),
                            isExtracting = false,
                            extractionProgress = 1f
                        ))
                    } else state
                }
            } else {
                // ── Scanned / image-only PDF: render at 1.5× for speed ───────────
                _uiState.update { s ->
                    s.copy(attachment = s.attachment?.copy(extractionProgress = 0.65f))
                }
                val pageImageBase64 = withContext(Dispatchers.IO) {
                    runCatching {
                        val tempFile = java.io.File(context.cacheDir, "ai_pdf_${uri.hashCode()}.pdf")
                        context.contentResolver.openInputStream(uri)?.use { input ->
                            java.io.FileOutputStream(tempFile).use { out -> input.copyTo(out) }
                        }
                        val fd = android.os.ParcelFileDescriptor.open(
                            tempFile, android.os.ParcelFileDescriptor.MODE_READ_ONLY
                        )
                        val renderer = android.graphics.pdf.PdfRenderer(fd)
                        val b64 = renderer.openPage(0).use { page ->
                            val scale = 1.5f   // reduced from 2.5× — faster encode/send, still readable
                            val w = (page.width  * scale).toInt()
                            val h = (page.height * scale).toInt()
                            val bmp = android.graphics.Bitmap.createBitmap(
                                w, h, android.graphics.Bitmap.Config.ARGB_8888
                            )
                            bmp.eraseColor(android.graphics.Color.WHITE)
                            page.render(bmp, null, null,
                                android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            val baos = java.io.ByteArrayOutputStream()
                            bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 65, baos)
                            android.util.Base64.encodeToString(
                                baos.toByteArray(), android.util.Base64.NO_WRAP
                            )
                        }
                        renderer.close()
                        fd.close()
                        b64
                    }.getOrNull()
                }
                _uiState.update { s ->
                    s.copy(attachment = s.attachment?.copy(extractionProgress = 0.9f))
                }

                _uiState.update { state ->
                    if (state.attachment?.displayName == fileName && state.attachment.type == "file") {
                        if (pageImageBase64 != null) {
                            state.copy(attachment = AiAttachment(
                                type               = "image",
                                displayName        = fileName,
                                imageBase64        = pageImageBase64,
                                pdfText            = null,
                                isExtracting       = false,
                                extractionProgress = 1f
                            ))
                        } else {
                            state.copy(attachment = state.attachment.copy(
                                pdfText            = "[Scanned PDF — could not render page for vision analysis.]",
                                isExtracting       = false,
                                extractionProgress = 1f
                            ))
                        }
                    } else state
                }
            }
        }
    }

    /** Clears only the pending (not-yet-sent) attachment picked by the user. */
    fun clearAttachment() {
        _uiState.update { it.copy(attachment = null) }
    }

    /**
     * Detaches the document that's been persisting across the conversation.
     * Subsequent questions will no longer include its content.
     */
    fun clearActiveDocument() {
        _uiState.update { it.copy(activeDocument = null) }
    }

    /**
     * Detaches the image that's been persisting across the conversation.
     * Subsequent questions will no longer include it.
     */
    fun clearActiveImage() {
        _uiState.update { it.copy(activeImage = null) }
    }

    fun sendMessage() {
        val text = _uiState.value.inputText.trim()
        val pendingAttachment = _uiState.value.attachment
        if ((text.isBlank() && pendingAttachment == null) || _uiState.value.isSending) return
        if (pendingAttachment?.type == "file" && pendingAttachment.isExtracting) {
            _uiState.update { it.copy(error = "Still extracting text from the PDF — please wait a moment.") }
            return
        }

        val displayText = text.ifBlank {
            when (pendingAttachment?.type) {
                "image" -> "What's in this image?"
                else -> "Tell me about this document."
            }
        }

        dispatchTurn(PendingTurn(displayText, pendingAttachment))
    }

    /** Resend the last turn that failed (e.g. due to a network error). */
    fun retryLastMessage() {
        val turn = _uiState.value.lastFailedTurn ?: return
        _uiState.update { it.copy(lastFailedTurn = null, error = null) }
        dispatchTurn(turn, isRetry = true)
    }

    fun dismissError() {
        _uiState.update { it.copy(error = null, lastFailedTurn = null) }
    }

    private fun dispatchTurn(turn: PendingTurn, isRetry: Boolean = false) {
        val pendingAttachment = turn.attachment
        val sessionId = _uiState.value.sessionId
        // A newly-attached PDF becomes the document that's active for the
        // rest of the conversation. A follow-up question with no new
        // attachment reuses the already-active document instead of dropping
        // its context — this is what lets "what's on page 12?" work without
        // re-uploading, and avoids re-parsing the file every question.
        val activeDocument = if (pendingAttachment?.type == "file")
            pendingAttachment
        else
            _uiState.value.activeDocument
        // Same persistence for images: a freshly-attached image becomes the
        // "active image" for the rest of the conversation, so follow-up
        // questions ("what's the second step in this diagram?") keep seeing
        // it without the student re-attaching it every turn.
        val activeImage = if (pendingAttachment?.type == "image")
            pendingAttachment
        else
            _uiState.value.activeImage

        if (!isRetry) {
            val userMsg = ChatMessage(
                role = "user",
                content = turn.displayText,
                attachmentName = pendingAttachment?.displayName,
                attachmentType = pendingAttachment?.type,
                imagePreviewUri = pendingAttachment?.previewUri
            )
            _uiState.update { state ->
                state.copy(
                    messages = state.messages + userMsg,
                    inputText = "",
                    attachment = null,
                    activeDocument = if (pendingAttachment?.type == "file") pendingAttachment else state.activeDocument,
                    activeImage = if (pendingAttachment?.type == "image") pendingAttachment else state.activeImage,
                    isSending = true,
                    error = null
                )
            }
            persistMessage(sessionId, userMsg)
        } else {
            _uiState.update { it.copy(isSending = true, error = null) }
        }

        viewModelScope.launch {
            val result = aiRepository.sendMessage(
                message = turn.displayText,
                sessionId = sessionId,
                imageBase64 = activeImage?.imageBase64,
                pdfText = activeDocument?.pdfText
            )
            result.onSuccess { reply ->
                val assistantMsg = ChatMessage(role = "assistant", content = reply.reply)
                _uiState.update { state ->
                    state.copy(messages = state.messages + assistantMsg, isSending = false)
                }
                persistMessage(sessionId, assistantMsg)
            }.onFailure { e ->
                _uiState.update { state ->
                    state.copy(
                        isSending = false,
                        error = e.message ?: "Something went wrong. Please try again.",
                        lastFailedTurn = turn
                    )
                }
            }
        }
    }

    /** Explicitly wipe chat history — only ever triggered by the user tapping "Clear". */
    fun clearSession() {
        val sessionId = _uiState.value.sessionId
        viewModelScope.launch {
            aiRepository.clearSession(sessionId)
            chatHistoryRepository.clearSession(sessionId)
            _uiState.update { AiChatUiState(sessionId = UUID.randomUUID().toString()) }
        }
    }
}
