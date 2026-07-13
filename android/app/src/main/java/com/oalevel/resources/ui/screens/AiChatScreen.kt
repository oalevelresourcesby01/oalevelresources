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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Brush.radialGradient(listOf(Color(0xFF7E57C2), Color(0xFF4527A0)))),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.SmartToy, null,
                                modifier = Modifier.size(20.dp), tint = Color.White)
                        }
                        Column {
                            Text(
                                "AI Assistant",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium
                            )
                            Text(
                                "O/A Level expert",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                },
                actions = {
                    IconButton(onClick = viewModel::clearSession) {
                        Icon(Icons.Filled.DeleteSweep, "Clear chat",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant)
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
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.messages) { msg ->
                    ChatBubble(message = msg)
                }
                if (uiState.isSending) {
                    item { ThinkingBubble() }
                }
            }
        }
    }
}

// Lightweight Markdown renderer
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
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Bottom
    ) {
        if (!isUser) {
            Box(
                modifier = Modifier
                    .size(30.dp)
                    .clip(CircleShape)
                    .background(Brush.radialGradient(listOf(Color(0xFF7E57C2), Color(0xFF4527A0)))),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.SmartToy, null,
                    modifier = Modifier.size(16.dp), tint = Color.White)
            }
            Spacer(Modifier.width(6.dp))
        }

        Column(
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            modifier = Modifier.widthIn(max = 290.dp)
        ) {
            // Attachment preview
            if (isUser) {
                when (message.attachmentType) {
                    "image" -> message.imagePreviewUri?.let { uri ->
                        AsyncImage(
                            model = uri,
                            contentDescription = "Attached image",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(160.dp, 120.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .shadow(2.dp, RoundedCornerShape(14.dp))
                                .padding(bottom = 4.dp)
                        )
                    }
                    "file" -> message.attachmentName?.let { name ->
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .padding(horizontal = 12.dp, vertical = 8.dp),
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

            // Bubble
            Box(
                modifier = Modifier
                    .shadow(
                        elevation = 1.dp,
                        shape = RoundedCornerShape(
                            topStart = 18.dp, topEnd = 18.dp,
                            bottomStart = if (isUser) 18.dp else 4.dp,
                            bottomEnd = if (isUser) 4.dp else 18.dp
                        )
                    )
                    .clip(
                        RoundedCornerShape(
                            topStart = 18.dp, topEnd = 18.dp,
                            bottomStart = if (isUser) 18.dp else 4.dp,
                            bottomEnd = if (isUser) 4.dp else 18.dp
                        )
                    )
                    .background(
                        if (isUser)
                            Brush.linearGradient(listOf(
                                MaterialTheme.colorScheme.primary,
                                MaterialTheme.colorScheme.secondary
                            ))
                        else
                            Brush.linearGradient(listOf(
                                MaterialTheme.colorScheme.surfaceVariant,
                                MaterialTheme.colorScheme.surfaceVariant
                            ))
                    )
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Text(
                    text = formatMarkdown(message.content),
                    color = if (isUser) Color.White
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium,
                    lineHeight = 22.sp
                )
            }
        }

        if (isUser) {
            Spacer(Modifier.width(6.dp))
            Box(
                modifier = Modifier
                    .size(30.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Person, null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer)
            }
        }
    }
}

@Composable
private fun ThinkingBubble() {
    val infiniteTransition = rememberInfiniteTransition(label = "typing")
    val dot1 by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = -8f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 300, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
            initialStartOffset = StartOffset(0)
        ), label = "d1"
    )
    val dot2 by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = -8f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 300, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
            initialStartOffset = StartOffset(150)
        ), label = "d2"
    )
    val dot3 by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = -8f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 300, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
            initialStartOffset = StartOffset(300)
        ), label = "d3"
    )

    Row(
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(CircleShape)
                .background(Brush.radialGradient(listOf(Color(0xFF7E57C2), Color(0xFF4527A0)))),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.SmartToy, null,
                modifier = Modifier.size(16.dp), tint = Color.White)
        }
        Box(
            modifier = Modifier
                .shadow(1.dp, RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp))
                .clip(RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(horizontal = 18.dp, vertical = 14.dp)
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
                            .background(MaterialTheme.colorScheme.primary)
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
    Surface(
        tonalElevation = 4.dp,
        shadowElevation = 8.dp
    ) {
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
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
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
                                        .size(48.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                )
                            }
                        }
                        "file" -> {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0xFFFFEBEE)),
                                contentAlignment = Alignment.Center
                            ) {
                                if (attachment.isExtracting) {
                                    CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                                } else {
                                    Icon(Icons.Filled.PictureAsPdf, null,
                                        modifier = Modifier.size(26.dp),
                                        tint = Color(0xFFC62828))
                                }
                            }
                        }
                    }
                    Text(
                        if (attachment.type == "file" && attachment.isExtracting)
                            "${attachment.displayName} — reading…"
                        else attachment.displayName,
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.labelMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    IconButton(onClick = onClearAttachment, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Filled.Close, "Remove",
                            modifier = Modifier.size(16.dp),
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
                IconButton(
                    onClick = onPickImage,
                    enabled = isEnabled,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(Icons.Filled.AddPhotoAlternate, "Attach image",
                        tint = if (isEnabled) MaterialTheme.colorScheme.primary
                               else MaterialTheme.colorScheme.outline)
                }
                IconButton(
                    onClick = onPickFile,
                    enabled = isEnabled,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(Icons.Filled.AttachFile, "Attach file",
                        tint = if (isEnabled) MaterialTheme.colorScheme.primary
                               else MaterialTheme.colorScheme.outline)
                }

                OutlinedTextField(
                    value = text,
                    onValueChange = onTextChange,
                    placeholder = { Text("Ask anything…", style = MaterialTheme.typography.labelLarge) },
                    modifier = Modifier.weight(1f),
                    minLines = 1,
                    maxLines = 4,
                    shape = RoundedCornerShape(24.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor   = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                        focusedContainerColor   = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    )
                )

                FilledIconButton(
                    onClick = onSend,
                    enabled = isEnabled && (text.isNotBlank() || attachment != null) &&
                        !(attachment?.type == "file" && attachment.isExtracting),
                    modifier = Modifier.size(44.dp),
                    shape = CircleShape
                ) {
                    if (isSending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp), strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Icon(Icons.Filled.Send, "Send", modifier = Modifier.size(18.dp))
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
        modifier = modifier
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.weight(1f))

        // AI avatar
        Box(
            modifier = Modifier
                .size(80.dp)
                .shadow(8.dp, CircleShape)
                .clip(CircleShape)
                .background(Brush.radialGradient(listOf(Color(0xFF7E57C2), Color(0xFF4527A0)))),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.SmartToy, null,
                modifier = Modifier.size(44.dp), tint = Color.White)
        }
        Spacer(Modifier.height(20.dp))
        Text(
            "AI Study Assistant",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.ExtraBold
        )
        Text(
            "Your personal O/A Level tutor",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp, bottom = 4.dp)
        )

        // Feature pills
        Row(
            modifier = Modifier.padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FeaturePill("📄 PDFs")
            FeaturePill("🖼️ Images")
            FeaturePill("💡 Explanations")
        }

        Spacer(Modifier.height(4.dp))
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

        Text(
            "Try asking:",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier
                .align(Alignment.Start)
                .padding(bottom = 8.dp)
        )

        suggestions.forEach { suggestion ->
            Card(
                onClick = { onSuggestionClick(suggestion) },
                modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("✦", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                    Text(
                        suggestion,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Icon(Icons.Filled.ChevronRight, null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.outline)
                }
            }
        }

        Spacer(Modifier.weight(1f))
    }
}

@Composable
private fun FeaturePill(text: String) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.secondaryContainer
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSecondaryContainer,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
        )
    }
}
