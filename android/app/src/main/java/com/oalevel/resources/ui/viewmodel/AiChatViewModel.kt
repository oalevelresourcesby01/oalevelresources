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
    val isExtracting: Boolean = false
)

data class AiChatUiState(
    val messages: List<ChatMessage> = emptyList(),
    val inputText: String = "",
    val isSending: Boolean = false,
    val error: String? = null,
    val sessionId: String = UUID.randomUUID().toString(),
    val attachment: AiAttachment? = null
)

@HiltViewModel
class AiChatViewModel @Inject constructor(
    private val aiRepository: AiRepository,
    private val chatHistoryRepository: ChatHistoryRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(AiChatUiState())
    val uiState: StateFlow<AiChatUiState> = _uiState.asStateFlow()

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
     *  1. Try PDFBox text extraction.
     *  2. If the extracted text is sparse (< 120 chars, i.e. scanned/image-only PDF),
     *     render the first page with Android's PdfRenderer at 2.5× scale and send it
     *     as a base-64 JPEG image so the vision model can read diagrams, handwriting
     *     and typeset formulas that PDFBox cannot extract.
     *  3. Otherwise send the plain text (capped at 15 000 chars).
     */
    fun onFileAttached(fileName: String, uri: Uri) {
        _uiState.update {
            it.copy(
                attachment = AiAttachment(
                    type = "file",
                    displayName = fileName,
                    pdfText = null,
                    isExtracting = true
                )
            )
        }
        viewModelScope.launch {
            // ── Step 1: text extraction ──────────────────────────────────────
            val extracted = withContext(Dispatchers.IO) {
                runCatching {
                    PDFBoxResourceLoader.init(context)
                    context.contentResolver.openInputStream(uri)?.use { input ->
                        PDDocument.load(input).use { doc ->
                            PDFTextStripper().getText(doc)
                        }
                    }
                }.getOrNull()
            }

            val cleanText = extracted?.trim() ?: ""
            val hasRichText = cleanText.length >= 120

            if (hasRichText) {
                // ── Text-based PDF: send extracted text ──────────────────────
                _uiState.update { state ->
                    if (state.attachment?.displayName == fileName && state.attachment.type == "file") {
                        state.copy(attachment = state.attachment.copy(
                            pdfText = cleanText.take(15_000),
                            isExtracting = false
                        ))
                    } else state
                }
            } else {
                // ── Scanned / image-only PDF: render page 1 for vision ───────
                val pageImageBase64 = withContext(Dispatchers.IO) {
                    runCatching {
                        // Write URI content to a temp file (PdfRenderer needs a real file)
                        val tempFile = java.io.File(context.cacheDir, "ai_pdf_${uri.hashCode()}.pdf")
                        context.contentResolver.openInputStream(uri)?.use { input ->
                            java.io.FileOutputStream(tempFile).use { out -> input.copyTo(out) }
                        }
                        val fd = android.os.ParcelFileDescriptor.open(
                            tempFile, android.os.ParcelFileDescriptor.MODE_READ_ONLY
                        )
                        val renderer = android.graphics.pdf.PdfRenderer(fd)
                        val b64 = renderer.openPage(0).use { page ->
                            val scale = 2.5f
                            val w = (page.width  * scale).toInt()
                            val h = (page.height * scale).toInt()
                            val bmp = android.graphics.Bitmap.createBitmap(
                                w, h, android.graphics.Bitmap.Config.ARGB_8888
                            )
                            bmp.eraseColor(android.graphics.Color.WHITE)
                            page.render(bmp, null, null,
                                android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            val baos = java.io.ByteArrayOutputStream()
                            bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, baos)
                            android.util.Base64.encodeToString(
                                baos.toByteArray(), android.util.Base64.NO_WRAP
                            )
                        }
                        renderer.close()
                        fd.close()
                        b64
                    }.getOrNull()
                }

                _uiState.update { state ->
                    if (state.attachment?.displayName == fileName && state.attachment.type == "file") {
                        if (pageImageBase64 != null) {
                            // Switch to image-type so vision model is invoked
                            state.copy(attachment = AiAttachment(
                                type         = "image",
                                displayName  = fileName,
                                imageBase64  = pageImageBase64,
                                pdfText      = null,
                                isExtracting = false
                            ))
                        } else {
                            state.copy(attachment = state.attachment.copy(
                                pdfText = "[Scanned PDF — could not render page for vision analysis.]",
                                isExtracting = false
                            ))
                        }
                    } else state
                }
            }
        }
    }

    fun clearAttachment() {
        _uiState.update { it.copy(attachment = null) }
    }

    fun sendMessage() {
        val text = _uiState.value.inputText.trim()
        val attachment = _uiState.value.attachment
        if ((text.isBlank() && attachment == null) || _uiState.value.isSending) return
        if (attachment?.type == "file" && attachment.isExtracting) {
            _uiState.update { it.copy(error = "Still extracting text from the PDF — please wait a moment.") }
            return
        }

        val displayText = text.ifBlank {
            when (attachment?.type) {
                "image" -> "What's in this image?"
                else -> "Tell me about this document."
            }
        }

        val userMsg = ChatMessage(
            role = "user",
            content = displayText,
            attachmentName = attachment?.displayName,
            attachmentType = attachment?.type,
            imagePreviewUri = attachment?.previewUri
        )

        val sessionId = _uiState.value.sessionId

        _uiState.update { state ->
            state.copy(
                messages = state.messages + userMsg,
                inputText = "",
                attachment = null,
                isSending = true,
                error = null
            )
        }
        persistMessage(sessionId, userMsg)

        viewModelScope.launch {
            val result = aiRepository.sendMessage(
                message = displayText,
                sessionId = sessionId,
                imageBase64 = attachment?.imageBase64,
                pdfText = attachment?.pdfText
            )
            result.onSuccess { reply ->
                val assistantMsg = ChatMessage(role = "assistant", content = reply.reply)
                _uiState.update { state ->
                    state.copy(messages = state.messages + assistantMsg, isSending = false)
                }
                persistMessage(sessionId, assistantMsg)
            }.onFailure { e ->
                _uiState.update { state ->
                    state.copy(isSending = false, error = e.message)
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
