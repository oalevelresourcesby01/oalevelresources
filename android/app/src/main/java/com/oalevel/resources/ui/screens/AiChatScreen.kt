package com.oalevel.resources.ui.screens

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.oalevel.resources.ui.viewmodel.AiChatViewModel
import com.oalevel.resources.ui.viewmodel.ChatMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatScreen(
    onBack: () -> Unit,
    viewModel: AiChatViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    // ── Image picker ──────────────────────────────────────────────────────────
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri ?: return@rememberLauncherForActivityResult
        scope.launch(Dispatchers.IO) {
            try {
                val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: return@launch
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                val fileName = getFileName(context.contentResolver, uri) ?: "image.jpg"
                withContext(Dispatchers.Main) {
                    viewModel.onImageAttached(base64, fileName, uri)
                }
            } catch (_: Exception) { }
        }
    }

    // ── File (PDF/doc) picker ─────────────────────────────────────────────────
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri ?: return@rememberLauncherForActivityResult
        val fileName = getFileName(context.contentResolver, uri) ?: "document"
        viewModel.onFileAttached(fileName, uri)
    }

    LaunchedEffect(uiState.messages.size) {
        if (uiState.messages.isNotEmpty()) {
            listState.animateScrollToItem(uiState.messages.lastIndex)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("O/A Level AI", fontWeight = FontWeight.Bold)
                        Text(
                            "Ask questions, attach images or files",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                },
                actions = {
                    IconButton(onClick = viewModel::clearSession) {
                        Icon(Icons.Filled.DeleteSweep, "Clear chat")
                    }
                }
            )
        },
        bottomBar = {
            MessageInputBar(
                text = uiState.inputText,
                onTextChange = viewModel::onInputChange,
                onSend = {
                    viewModel.sendMessage()
                    scope.launch {
                        if (uiState.messages.isNotEmpty()) {
                            listState.animateScrollToItem(uiState.messages.lastIndex)
                        }
                    }
                },
                onPickImage = { imagePickerLauncher.launch("image/*") },
                onPickFile = { filePickerLauncher.launch("*/*") },
                isSending = uiState.isSending,
                isEnabled = !uiState.isSending,
                attachment = uiState.attachment,
                onClearAttachment = viewModel::clearAttachment
            )
        }
    ) { padding ->
        if (uiState.messages.isEmpty() && !uiState.isSending) {
            AiWelcomeScreen(
                modifier = Modifier.fillMaxSize().padding(padding),
                onSuggestionClick = { viewModel.onInputChange(it) }
            )
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.messages) { msg ->
                    ChatBubble(message = msg)
                }
                if (uiState.isSending) {
                    item { ThinkingBubble() }
                }
            }
        }

        // Error snackbar
        uiState.error?.let { error ->
            LaunchedEffect(error) {
                listState.animateScrollToItem(uiState.messages.lastIndex.coerceAtLeast(0))
            }
        }
    }
}

// Lightweight Markdown renderer covering headings, bullet/numbered lists,
// bold, italic, and inline code spans — enough for typical AI chat responses
// without pulling in a full Markdown library dependency.
private fun formatInlineMarkdown(
    builder: androidx.compose.ui.text.AnnotatedString.Builder,
    text: String
) {
    val pattern = Regex("(\\*\\*(.+?)\\*\\*)|(\\*(.+?)\\*)|(_(.+?)_)|(`(.+?)`)")
    var lastIndex = 0
    for (match in pattern.findAll(text)) {
        if (match.range.first > lastIndex) {
            builder.append(text.substring(lastIndex, match.range.first))
        }
        when {
            match.groupValues[2].isNotEmpty() -> builder.withStyle(
                androidx.compose.ui.text.SpanStyle(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
            ) { append(match.groupValues[2]) }
            match.groupValues[4].isNotEmpty() -> builder.withStyle(
                androidx.compose.ui.text.SpanStyle(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
            ) { append(match.groupValues[4]) }
            match.groupValues[6].isNotEmpty() -> builder.withStyle(
                androidx.compose.ui.text.SpanStyle(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
            ) { append(match.groupValues[6]) }
            match.groupValues[8].isNotEmpty() -> builder.withStyle(
                androidx.compose.ui.text.SpanStyle(
                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                    background = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.08f)
                )
            ) { append(match.groupValues[8]) }
        }
        lastIndex = match.range.last + 1
    }
    if (lastIndex < text.length) builder.append(text.substring(lastIndex))
}

/**
 * Renders a full markdown block (multiple lines) into an AnnotatedString,
 * handling `#`/`##`/`###` headings and `- `/`1. ` list markers per line, on
 * top of the inline bold/italic/code formatting above.
 */
private fun formatMarkdown(text: String): androidx.compose.ui.text.AnnotatedString {
    return androidx.compose.ui.text.buildAnnotatedString {
        val lines = text.split("\n")
        lines.forEachIndexed { i, rawLine ->
            val line = rawLine.trimEnd()
            val headingMatch = Regex("^(#{1,6})\\s+(.*)$").find(line)
            val bulletMatch = Regex("^[-*]\\s+(.*)$").find(line)
            val numberedMatch = Regex("^(\\d+)\\.\\s+(.*)$").find(line)
            when {
                headingMatch != null -> {
                    val level = headingMatch.groupValues[1].length
                    withStyle(
                        androidx.compose.ui.text.SpanStyle(
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                            fontSize = when (level) {
                                1 -> androidx.compose.ui.unit.TextUnit(20f, androidx.compose.ui.unit.TextUnitType.Sp)
                                2 -> androidx.compose.ui.unit.TextUnit(18f, androidx.compose.ui.unit.TextUnitType.Sp)
                                else -> androidx.compose.ui.unit.TextUnit(16f, androidx.compose.ui.unit.TextUnitType.Sp)
                            }
                        )
                    ) { formatInlineMarkdown(this, headingMatch.groupValues[2]) }
                }
                bulletMatch != null -> {
                    append("•  ")
                    formatInlineMarkdown(this, bulletMatch.groupValues[1])
                }
                numberedMatch != null -> {
                    append("${numberedMatch.groupValues[1]}.  ")
                    formatInlineMarkdown(this, numberedMatch.groupValues[2])
                }
                else -> formatInlineMarkdown(this, line)
            }
            if (i != lines.lastIndex) append("\n")
        }
    }
}

private fun getFileName(resolver: ContentResolver, uri: Uri): String? {
    return try {
        resolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) cursor.getString(idx) else null
            } else null
        }
    } catch (_: Exception) { null }
}

@Composable
private fun ChatBubble(message: ChatMessage) {
    val isUser = message.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (!isUser) {
            Icon(
                Icons.Filled.SmartToy, null,
                modifier = Modifier.size(28.dp).padding(end = 4.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        }
        Column(
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            modifier = Modifier.widthIn(max = 300.dp)
        ) {
            // Attachment preview in bubble
            if (isUser) {
                when (message.attachmentType) {
                    "image" -> message.imagePreviewUri?.let { uri ->
                        AsyncImage(
                            model = uri,
                            contentDescription = "Attached image",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(160.dp, 120.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .padding(bottom = 4.dp)
                        )
                    }
                    "file" -> message.attachmentName?.let { name ->
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Filled.AttachFile, null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.primary)
                            Text(name,
                                style = MaterialTheme.typography.labelSmall,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis)
                        }
                        Spacer(Modifier.height(4.dp))
                    }
                }
            }

            Box(
                modifier = Modifier
                    .clip(
                        RoundedCornerShape(
                            topStart = 16.dp, topEnd = 16.dp,
                            bottomStart = if (isUser) 16.dp else 4.dp,
                            bottomEnd = if (isUser) 4.dp else 16.dp
                        )
                    )
                    .background(
                        if (isUser) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surfaceVariant
                    )
                    .padding(12.dp)
            ) {
                Text(
                    text = formatMarkdown(message.content),
                    color = if (isUser) MaterialTheme.colorScheme.onPrimary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@Composable
private fun ThinkingBubble() {
    val infiniteTransition = rememberInfiniteTransition(label = "typing")
    // InfiniteRepeatableSpec has no .copy(initialStartOffset=...) — each dot
    // needs its own infiniteRepeatable() call with its own start offset.
    // (Reusing .copy() on the spec was a compile error that broke the whole
    // Android build, so this animation never actually shipped.)
    fun jumpSpec(startOffsetMillis: Int) = infiniteRepeatable<Float>(
        animation = keyframes {
            durationMillis = 900
            0f at 0 using LinearEasing
            (-8f) at 220 using LinearEasing
            0f at 440 using LinearEasing
            0f at 900 using LinearEasing
        },
        repeatMode = RepeatMode.Restart,
        initialStartOffset = StartOffset(startOffsetMillis)
    )
    val dot1 by infiniteTransition.animateFloat(0f, 0f, animationSpec = jumpSpec(0), label = "d1")
    val dot2 by infiniteTransition.animateFloat(0f, 0f, animationSpec = jumpSpec(150), label = "d2")
    val dot3 by infiniteTransition.animateFloat(0f, 0f, animationSpec = jumpSpec(300), label = "d3")

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(Icons.Filled.SmartToy, null,
            modifier = Modifier.size(28.dp),
            tint = MaterialTheme.colorScheme.primary)
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(16.dp, 16.dp, 16.dp, 4.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (offset in listOf(dot1, dot2, dot3)) {
                    Box(
                        modifier = Modifier
                            .size(9.dp)
                            .offset(y = offset.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.75f))
                    )
                }
            }
        }
    }
}

@Composable
private fun MessageInputBar(
    text: String,
    onTextChange: (String) -> Unit,
    onSend: () -> Unit,
    onPickImage: () -> Unit,
    onPickFile: () -> Unit,
    isSending: Boolean,
    isEnabled: Boolean,
    attachment: com.oalevel.resources.ui.viewmodel.AiAttachment?,
    onClearAttachment: () -> Unit
) {
    Surface(tonalElevation = 3.dp) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .imePadding()
        ) {
            // ── Attachment preview strip ──────────────────────────────────────
            if (attachment != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    when (attachment.type) {
                        "image" -> {
                            attachment.previewUri?.let { uri ->
                                AsyncImage(
                                    model = uri,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .size(56.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                )
                            }
                        }
                        "file" -> {
                            if (attachment.isExtracting) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Filled.PictureAsPdf, null,
                                    modifier = Modifier.size(32.dp),
                                    tint = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                    Text(
                        if (attachment.type == "file" && attachment.isExtracting)
                            "${attachment.displayName} (reading…)"
                        else attachment.displayName,
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.labelMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    IconButton(onClick = onClearAttachment, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Filled.Close, "Remove attachment",
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                HorizontalDivider()
            }

            // ── Input row ─────────────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Image attach
                IconButton(
                    onClick = onPickImage,
                    enabled = isEnabled,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        Icons.Filled.AddPhotoAlternate,
                        contentDescription = "Attach image",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                // File attach
                IconButton(
                    onClick = onPickFile,
                    enabled = isEnabled,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        Icons.Filled.AttachFile,
                        contentDescription = "Attach file",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }

                OutlinedTextField(
                    value = text,
                    onValueChange = onTextChange,
                    placeholder = { Text("Ask a question…") },
                    modifier = Modifier.weight(1f),
                    maxLines = 4,
                    shape = RoundedCornerShape(24.dp)
                )

                FilledIconButton(
                    onClick = onSend,
                    enabled = isEnabled && (text.isNotBlank() || attachment != null) &&
                        !(attachment?.type == "file" && attachment.isExtracting)
                ) {
                    if (isSending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp), strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Icon(Icons.Filled.Send, "Send")
                    }
                }
            }
        }
    }
}

@Composable
private fun AiWelcomeScreen(
    modifier: Modifier = Modifier,
    onSuggestionClick: (String) -> Unit
) {
    val suggestions = listOf(
        "Explain the difference between AS and A2 Level",
        "Help me solve this Physics MCQ",
        "Create a study plan for O Level Chemistry",
        "Summarize the key topics in Mathematics",
        "What are common mistakes in IGCSE Biology?"
    )

    Column(
        modifier = modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Filled.SmartToy, null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(Modifier.height(16.dp))
        Text(
            "O/A Level AI Assistant",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Text(
            "Ask questions, attach images or PDF files",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp)
        )
        suggestions.forEach { suggestion ->
            SuggestionChip(
                onClick = { onSuggestionClick(suggestion) },
                label = { Text(suggestion, style = MaterialTheme.typography.labelMedium) },
                modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)
            )
        }
    }
}
