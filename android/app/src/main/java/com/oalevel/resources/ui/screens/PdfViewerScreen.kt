package com.oalevel.resources.ui.screens

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.rotate
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.ui.viewmodel.PdfViewerViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import java.io.File
import java.io.FileOutputStream
import java.net.URL

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PdfViewerScreen(
    nodeId: String,
    displayName: String,
    onBack: () -> Unit,
    onOpenAnother: (String, String) -> Unit,
    viewModel: PdfViewerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val shareScope = rememberCoroutineScope()
    var showMenu            by remember { mutableStateOf(false) }
    var showGoToPageDialog  by remember { mutableStateOf(false) }
    var goToPageInput       by remember { mutableStateOf("") }
    var showPageRangeDialog by remember { mutableStateOf(false) }
    var rangeFromInput      by remember { mutableStateOf("") }
    var rangeToInput        by remember { mutableStateOf("") }
    var isExtractingRange   by remember { mutableStateOf(false) }
    var scrollToPage        by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(nodeId) { viewModel.loadPdf(nodeId, displayName) }

    // Split-view PDF search dialog
    if (uiState.showSplitSearch) {
        AlertDialog(
            onDismissRequest = viewModel::closeSplitSearch,
            title = { Text("Open Side by Side") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Tabs: Search vs Browse
                    TabRow(selectedTabIndex = if (uiState.splitPickerBrowseMode) 1 else 0) {
                        Tab(
                            selected = !uiState.splitPickerBrowseMode,
                            onClick = { viewModel.setSplitPickerMode(false) },
                            text = { Text("Search") }
                        )
                        Tab(
                            selected = uiState.splitPickerBrowseMode,
                            onClick = { viewModel.setSplitPickerMode(true) },
                            text = { Text("Browse") }
                        )
                    }

                    if (!uiState.splitPickerBrowseMode) {
                        OutlinedTextField(
                            value = uiState.splitSearchQuery,
                            onValueChange = viewModel::onSplitSearchChange,
                            placeholder = { Text("Search for a PDF…") },
                            leadingIcon = {
                                if (uiState.isSplitSearching)
                                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                                else Icon(Icons.Filled.Search, null)
                            },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        if (uiState.splitSearchResults.isNotEmpty()) {
                            LazyColumn(modifier = Modifier.heightIn(max = 280.dp)) {
                                items(uiState.splitSearchResults) { result ->
                                    ListItem(
                                        headlineContent = {
                                            Text(result.name, maxLines = 2,
                                                overflow = TextOverflow.Ellipsis,
                                                style = MaterialTheme.typography.bodyMedium)
                                        },
                                        leadingContent = {
                                            Icon(Icons.Filled.PictureAsPdf, null,
                                                tint = MaterialTheme.colorScheme.error)
                                        },
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .clickable { viewModel.loadSecondPdf(result.id, result.name) }
                                    )
                                    HorizontalDivider()
                                }
                            }
                        } else if (uiState.splitSearchQuery.length >= 2 && !uiState.isSplitSearching) {
                            Text("No PDFs found",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(8.dp))
                        }
                    } else {
                        // ── Browse mode: navigate folders to pick a PDF ─────────
                        val stack = uiState.splitBrowseStack
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (stack.size > 1) {
                                IconButton(onClick = viewModel::onSplitBrowseBack) {
                                    Icon(Icons.Filled.ArrowBack, "Up one level")
                                }
                            }
                            Text(
                                stack.last().second,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                        Box(modifier = Modifier.heightIn(max = 280.dp)) {
                            if (uiState.isSplitBrowsing) {
                                Box(Modifier.fillMaxWidth().padding(24.dp), Alignment.Center) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                }
                            } else if (uiState.splitBrowseChildren.isEmpty()) {
                                Text("This folder is empty",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(8.dp))
                            } else {
                                LazyColumn {
                                    items(uiState.splitBrowseChildren) { node ->
                                        val isFolder = node.type == "folder"
                                        ListItem(
                                            headlineContent = {
                                                Text(node.name, maxLines = 2,
                                                    overflow = TextOverflow.Ellipsis,
                                                    style = MaterialTheme.typography.bodyMedium)
                                            },
                                            leadingContent = {
                                                Icon(
                                                    if (isFolder) Icons.Filled.Folder else Icons.Filled.PictureAsPdf,
                                                    null,
                                                    tint = if (isFolder) MaterialTheme.colorScheme.primary
                                                           else MaterialTheme.colorScheme.error
                                                )
                                            },
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .clickable {
                                                    if (isFolder) viewModel.onSplitBrowseFolderClick(node.id, node.name)
                                                    else viewModel.loadSecondPdf(node.id, node.name)
                                                }
                                        )
                                        HorizontalDivider()
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = viewModel::closeSplitSearch) { Text("Cancel") }
            }
        )
    }

    // ── Go-to-page dialog ─────────────────────────────────────────────────────
    if (showGoToPageDialog) {
        AlertDialog(
            onDismissRequest = { showGoToPageDialog = false; goToPageInput = "" },
            title = { Text("Go to Page") },
            text = {
                OutlinedTextField(
                    value = goToPageInput,
                    onValueChange = { v -> if (v.length <= 5) goToPageInput = v.filter(Char::isDigit) },
                    label = { Text("Page (1–${uiState.totalPages})") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    val p = goToPageInput.toIntOrNull()
                    if (p != null && p in 1..uiState.totalPages) scrollToPage = p
                    showGoToPageDialog = false; goToPageInput = ""
                }) { Text("Go") }
            },
            dismissButton = {
                TextButton(onClick = { showGoToPageDialog = false; goToPageInput = "" }) { Text("Cancel") }
            }
        )
    }

    // ── Share page-range dialog ───────────────────────────────────────────────
    if (showPageRangeDialog) {
        AlertDialog(
            onDismissRequest = { if (!isExtractingRange) showPageRangeDialog = false },
            title = { Text("Share Page Range") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Choose pages to extract from "$displayName" and share as a smaller PDF.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = rangeFromInput,
                            onValueChange = { v -> if (v.length <= 5) rangeFromInput = v.filter(Char::isDigit) },
                            label = { Text("From page") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = rangeToInput,
                            onValueChange = { v -> if (v.length <= 5) rangeToInput = v.filter(Char::isDigit) },
                            label = { Text("To page") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (isExtractingRange) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            Text("Extracting pages…", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !isExtractingRange,
                    onClick = {
                        val from  = rangeFromInput.toIntOrNull() ?: 1
                        val to    = rangeToInput.toIntOrNull()   ?: uiState.totalPages
                        val url   = uiState.pdfUrl               ?: return@TextButton
                        val total = uiState.totalPages
                        val safeFrom = from.coerceIn(1, total)
                        val safeTo   = to.coerceIn(safeFrom, total)
                        isExtractingRange = true
                        shareScope.launch {
                            sharePageRange(context, url, displayName, safeFrom, safeTo)
                            isExtractingRange = false
                            showPageRangeDialog = false
                        }
                    }
                ) { Text("Share") }
            },
            dismissButton = {
                TextButton(
                    enabled = !isExtractingRange,
                    onClick = { showPageRangeDialog = false }
                ) { Text("Cancel") }
            }
        )
    }

    val nightMode = uiState.nightMode
    val rotation = uiState.rotation
    val isFullscreen = uiState.isFullscreen
    val topBarContainerColor = if (nightMode) Color(0xFF212121) else MaterialTheme.colorScheme.surface
    val topBarContentColor  = if (nightMode) Color.White else MaterialTheme.colorScheme.onSurface

    if (isFullscreen && uiState.pdfUrl != null) {
        // ── Fullscreen: hide system bars for true immersive reading ──────────────
        val view = LocalView.current
        DisposableEffect(Unit) {
            val window = (view.context as? android.app.Activity)?.window
            val controller = window?.let {
                androidx.core.view.WindowCompat.getInsetsController(it, view)
            }
            controller?.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars())
            controller?.systemBarsBehavior =
                androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            onDispose {
                controller?.show(androidx.core.view.WindowInsetsCompat.Type.systemBars())
            }
        }
        val bgColor = if (nightMode) Color(0xFF424242) else MaterialTheme.colorScheme.background
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(bgColor)
        ) {
            if (uiState.isSplitView) {
                var splitRatio by remember { mutableFloatStateOf(0.5f) }
                BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                    val totalWidthPx = constraints.maxWidth.toFloat()
                    Row(modifier = Modifier.fillMaxSize()) {
                        PdfPane(
                            url = uiState.pdfUrl!!, nightMode = nightMode, rotation = rotation,
                            paneTitle = "📄 $displayName", onLoaded = viewModel::onPdfLoaded,
                            onPageChange = viewModel::onPageChange,
                            modifier = Modifier.weight(splitRatio).fillMaxHeight()
                        )
                        Box(
                            modifier = Modifier.width(12.dp).fillMaxHeight()
                                .pointerInput(totalWidthPx) {
                                    detectDragGestures { change, dragAmount ->
                                        change.consume()
                                        if (totalWidthPx > 0f)
                                            splitRatio = (splitRatio + dragAmount.x / totalWidthPx).coerceIn(0.2f, 0.8f)
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Box(Modifier.width(3.dp).fillMaxHeight().background(MaterialTheme.colorScheme.primary))
                        }
                        when {
                            uiState.secondIsLoading -> Box(
                                Modifier.weight(1f - splitRatio).fillMaxHeight(), Alignment.Center
                            ) { PdfLoadingState() }
                            uiState.secondPdfUrl != null -> PdfPane(
                                url = uiState.secondPdfUrl!!, nightMode = nightMode, rotation = rotation,
                                paneTitle = "📄 ${uiState.secondName}", onLoaded = viewModel::onSecondPdfLoaded,
                                onPageChange = viewModel::onSecondPageChange,
                                modifier = Modifier.weight(1f - splitRatio).fillMaxHeight()
                            )
                            else -> Box(Modifier.weight(1f - splitRatio).fillMaxHeight(), Alignment.Center) {
                                Text("Second PDF loading…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            } else {
                PdfPane(
                    url = uiState.pdfUrl!!, nightMode = nightMode, rotation = rotation,
                    paneTitle = "", onLoaded = viewModel::onPdfLoaded,
                    onPageChange = viewModel::onPageChange,
                    modifier = Modifier.fillMaxSize()
                )
            }
            // Floating toolbar — top-left corner
            Row(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                SmallFloatingActionButton(
                    onClick = { viewModel.toggleFullscreen() },
                    containerColor = Color(0xCC000000),
                    contentColor = Color.White
                ) { Icon(Icons.Filled.FullscreenExit, "Exit fullscreen", modifier = Modifier.size(20.dp)) }
                SmallFloatingActionButton(
                    onClick = onBack,
                    containerColor = Color(0xCC000000),
                    contentColor = Color.White
                ) { Icon(Icons.Filled.ArrowBack, "Back", modifier = Modifier.size(20.dp)) }
            }
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (uiState.isSplitView) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(displayName, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.titleSmall,
                                color = topBarContentColor,
                                modifier = Modifier.weight(1f))
                            Text("│", color = topBarContentColor.copy(alpha = 0.4f))
                            Text(uiState.secondName, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.titleSmall,
                                color = topBarContentColor,
                                modifier = Modifier.weight(1f))
                        }
                    } else {
                        Column {
                            Text(displayName, maxLines = 1,
                                style = MaterialTheme.typography.titleSmall,
                                color = topBarContentColor,
                                overflow = TextOverflow.Ellipsis)
                            if (uiState.totalPages > 0) {
                                Text(
                                    "Page ${uiState.currentPage + 1} of ${uiState.totalPages}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = topBarContentColor.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back", tint = topBarContentColor)
                    }
                },
                actions = {
                    // Download button — only shown when PDF is loaded
                    if (uiState.pdfUrl != null) {
                        IconButton(onClick = viewModel::download) {
                            Icon(
                                if (uiState.isDownloaded) Icons.Filled.DownloadDone
                                else Icons.Filled.Download,
                                contentDescription = if (uiState.isDownloaded) "Already downloaded" else "Download PDF",
                                tint = if (uiState.isDownloaded) MaterialTheme.colorScheme.primary
                                       else topBarContentColor
                            )
                        }
                    }
                    IconButton(onClick = viewModel::toggleNightMode) {
                        Icon(
                            if (nightMode) Icons.Filled.LightMode else Icons.Filled.DarkMode,
                            "Toggle night mode",
                            tint = topBarContentColor
                        )
                    }
                    if (uiState.isSplitView) {
                        IconButton(onClick = viewModel::closeSplitView) {
                            Icon(Icons.Filled.CloseFullscreen, "Close split view",
                                tint = topBarContentColor)
                        }
                    }
                    IconButton(onClick = viewModel::toggleFavourite) {
                        Icon(
                            if (uiState.isFavourite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                            "Favourite",
                            tint = if (uiState.isFavourite) MaterialTheme.colorScheme.error
                                   else topBarContentColor
                        )
                    }
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Filled.MoreVert, "More options", tint = topBarContentColor)
                        }
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                            DropdownMenuItem(
                                text = { Text("Rotate 90°") },
                                leadingIcon = { Icon(Icons.Filled.RotateRight, null) },
                                onClick = { showMenu = false; viewModel.rotate() }
                            )
                            DropdownMenuItem(
                                text = { Text(if (uiState.isSplitView) "Close Split View" else "Open Side by Side") },
                                leadingIcon = {
                                    Icon(if (uiState.isSplitView) Icons.Filled.CloseFullscreen
                                         else Icons.Filled.SpaceDashboard, null)
                                },
                                onClick = {
                                    showMenu = false
                                    if (uiState.isSplitView) viewModel.closeSplitView()
                                    else viewModel.openSplitSearch()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text(if (isFullscreen) "Exit Fullscreen" else "Fullscreen") },
                                leadingIcon = {
                                    Icon(if (isFullscreen) Icons.Filled.FullscreenExit else Icons.Filled.Fullscreen, null)
                                },
                                onClick = { showMenu = false; viewModel.toggleFullscreen() }
                            )
                            if (uiState.totalPages > 0) {
                                DropdownMenuItem(
                                    text = { Text("Go to Page…") },
                                    leadingIcon = { Icon(Icons.Filled.FindInPage, null) },
                                    onClick = { showMenu = false; showGoToPageDialog = true }
                                )
                            }
                            DropdownMenuItem(
                                text = { Text("Share") },
                                leadingIcon = { Icon(Icons.Filled.Share, null) },
                                onClick = {
                                    showMenu = false
                                    uiState.pdfUrl?.let { url ->
                                        shareScope.launch {
                                            sharePdfFile(context, url, displayName)
                                        }
                                    }
                                }
                            )
                            if (uiState.pdfUrl != null && uiState.totalPages > 0) {
                                DropdownMenuItem(
                                    text = { Text("Share Page Range…") },
                                    leadingIcon = { Icon(Icons.Filled.ContentCut, null) },
                                    onClick = {
                                        showMenu = false
                                        rangeFromInput = "1"
                                        rangeToInput   = "${uiState.totalPages}"
                                        showPageRangeDialog = true
                                    }
                                )
                            }
                            DropdownMenuItem(
                                text = { Text("Open in Browser") },
                                leadingIcon = { Icon(Icons.Filled.OpenInBrowser, null) },
                                onClick = {
                                    showMenu = false
                                    uiState.pdfUrl?.let { url ->
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                    }
                                }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = topBarContainerColor
                )
            )
        },
        contentWindowInsets = WindowInsets(0)
    ) { padding ->
        val bgColor = if (nightMode) Color(0xFF424242) else MaterialTheme.colorScheme.background
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(bgColor)
        ) {
            when {
                uiState.isLoading -> PdfLoadingState()
                uiState.error != null -> PdfErrorState(uiState.error!!) {
                    viewModel.loadPdf(nodeId, displayName)
                }
                uiState.pdfUrl != null -> {
                    if (uiState.isSplitView) {
                        // ── Split view: pane labels + dual progress bars ──────────
                        var splitRatio by remember { mutableFloatStateOf(0.5f) }
                        Column(modifier = Modifier.fillMaxSize()) {
                            BoxWithConstraints(modifier = Modifier.weight(1f).fillMaxWidth()) {
                                val totalWidthPx = constraints.maxWidth.toFloat()
                                Row(modifier = Modifier.fillMaxSize()) {
                                    // Primary pane
                                    PdfPane(
                                        url          = uiState.pdfUrl!!,
                                        nightMode    = nightMode,
                                        rotation     = rotation,
                                        paneTitle    = "📄 $displayName",
                                        onLoaded     = viewModel::onPdfLoaded,
                                        onPageChange = viewModel::onPageChange,
                                        modifier     = Modifier.weight(splitRatio).fillMaxHeight()
                                    )
                                    // Draggable divider
                                    Box(
                                        modifier = Modifier
                                            .width(12.dp)
                                            .fillMaxHeight()
                                            .pointerInput(totalWidthPx) {
                                                detectDragGestures { change, dragAmount ->
                                                    change.consume()
                                                    if (totalWidthPx > 0f) {
                                                        val delta = dragAmount.x / totalWidthPx
                                                        splitRatio = (splitRatio + delta).coerceIn(0.2f, 0.8f)
                                                    }
                                                }
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .width(3.dp)
                                                .fillMaxHeight()
                                                .background(MaterialTheme.colorScheme.primary)
                                        )
                                    }
                                    // Secondary pane
                                    when {
                                        uiState.secondIsLoading -> Box(
                                            Modifier.weight(1f - splitRatio).fillMaxHeight(), Alignment.Center
                                        ) { PdfLoadingState() }
                                        uiState.secondPdfUrl != null ->
                                            PdfPane(
                                                url          = uiState.secondPdfUrl!!,
                                                nightMode    = nightMode,
                                                rotation     = rotation,
                                                paneTitle    = "📄 ${uiState.secondName}",
                                                onLoaded     = viewModel::onSecondPdfLoaded,
                                                onPageChange = viewModel::onSecondPageChange,
                                                modifier     = Modifier.weight(1f - splitRatio).fillMaxHeight()
                                            )
                                        else -> Box(
                                            Modifier.weight(1f - splitRatio).fillMaxHeight(), Alignment.Center
                                        ) {
                                            Text("Second PDF loading…",
                                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                            }

                            // Dual progress bars at bottom of split view
                            val leftProg  = if (uiState.totalPages > 0)
                                (uiState.currentPage + 1f) / uiState.totalPages else 0f
                            val rightProg = if (uiState.secondTotalPages > 0)
                                (uiState.secondCurrentPage + 1f) / uiState.secondTotalPages else 0f

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(if (nightMode) Color(0xFF212121) else Color(0xFFF5F5F5))
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                LinearProgressIndicator(
                                    progress   = { leftProg },
                                    modifier   = Modifier.weight(1f).height(4.dp),
                                    color      = MaterialTheme.colorScheme.primary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                                Box(
                                    modifier = Modifier.width(3.dp).height(12.dp)
                                        .background(MaterialTheme.colorScheme.primary)
                                )
                                LinearProgressIndicator(
                                    progress   = { rightProg },
                                    modifier   = Modifier.weight(1f).height(4.dp),
                                    color      = MaterialTheme.colorScheme.tertiary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            }
                        }
                    } else {
                        // ── Single view: PDF + reading progress bar at bottom ─────
                        Column(modifier = Modifier.fillMaxSize()) {
                            PdfPane(
                                url              = uiState.pdfUrl!!,
                                nightMode        = nightMode,
                                rotation         = rotation,
                                paneTitle        = "",
                                onLoaded         = viewModel::onPdfLoaded,
                                onPageChange     = viewModel::onPageChange,
                                scrollToPage     = scrollToPage,
                                onScrollConsumed = { scrollToPage = null },
                                modifier         = Modifier.weight(1f)
                            )

                            // Reading progress bar
                            val progress = if (uiState.totalPages > 0)
                                (uiState.currentPage + 1f) / uiState.totalPages else 0f
                            val barBg = if (nightMode) Color(0xFF212121) else Color(0xFFF5F5F5)

                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(barBg)
                                    .padding(horizontal = 16.dp, vertical = 4.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        "Page ${uiState.currentPage + 1} / ${uiState.totalPages}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (nightMode) Color.White.copy(alpha = 0.7f)
                                                else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        "${(progress * 100).toInt()}%",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                                Spacer(Modifier.height(2.dp))
                                LinearProgressIndicator(
                                    progress   = { progress },
                                    modifier   = Modifier.fillMaxWidth().height(3.dp)
                                        .clip(RoundedCornerShape(2.dp)),
                                    color      = MaterialTheme.colorScheme.primary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                                Spacer(Modifier.height(4.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Share the actual PDF file (not just its link) via FileProvider ─────────

private suspend fun sharePdfFile(context: android.content.Context, url: String, displayName: String) {
    val safeName = displayName.let { if (it.endsWith(".pdf", ignoreCase = true)) it else "$it.pdf" }
    val file = withContext(Dispatchers.IO) {
        runCatching {
            val tempFile = File(context.cacheDir, "pdf_${url.hashCode()}.pdf")
            if (!tempFile.exists() || tempFile.length() == 0L) {
                URL(url).openStream().use { input ->
                    FileOutputStream(tempFile).use { output -> input.copyTo(output) }
                }
            }
            tempFile
        }.getOrNull()
    } ?: return

    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, safeName)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Share $safeName"))
}

// ── Extract a page range and share it as a smaller PDF ────────────────────

private suspend fun sharePageRange(
    context: android.content.Context,
    url: String,
    displayName: String,
    fromPage: Int,
    toPage: Int
) {
    val safeName = if (displayName.endsWith(".pdf", ignoreCase = true)) displayName else "$displayName.pdf"
    val outFile = withContext(Dispatchers.IO) {
        runCatching {
            val srcFile = File(context.cacheDir, "pdf_${url.hashCode()}.pdf")
            if (!srcFile.exists() || srcFile.length() == 0L) {
                URL(url).openStream().use { i -> FileOutputStream(srcFile).use { o -> i.copyTo(o) } }
            }
            com.tom_roush.pdfbox.android.PDFBoxResourceLoader.init(context)
            val srcDoc = com.tom_roush.pdfbox.pdmodel.PDDocument.load(srcFile)
            val dstDoc = com.tom_roush.pdfbox.pdmodel.PDDocument()
            val fromIdx = (fromPage - 1).coerceIn(0, srcDoc.pages.count - 1)
            val toIdx   = (toPage   - 1).coerceIn(fromIdx, srcDoc.pages.count - 1)
            for (i in fromIdx..toIdx) dstDoc.importPage(srcDoc.getPage(i))
            val out = File(context.cacheDir, "range_p${fromPage}_${toPage}_${url.hashCode()}.pdf")
            dstDoc.save(out); dstDoc.close(); srcDoc.close()
            out
        }.getOrNull()
    } ?: return
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", outFile)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, "Pages $fromPage–$toPage of $safeName")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Share pages $fromPage–$toPage"))
}

// ── Lazy PDF pane — downloads file once, renders pages on demand ───────────

@Composable
private fun PdfPane(
    url: String,
    nightMode: Boolean = false,
    rotation: Int = 0,
    paneTitle: String = "",
    onLoaded: (Int) -> Unit,
    onPageChange: (Int) -> Unit = {},
    scrollToPage: Int? = null,
    onScrollConsumed: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    var filePath         by remember(url) { mutableStateOf<String?>(null) }
    var pageCount        by remember(url) { mutableStateOf(0) }
    var isLoading        by remember(url) { mutableStateOf(true) }
    var error            by remember(url) { mutableStateOf<String?>(null) }
    var downloadProgress by remember(url) { mutableStateOf(0f) }

    LaunchedEffect(url) {
        isLoading = true
        error     = null
        downloadProgress = 0f

        data class PaneInit(val path: String, val count: Int)

        // ── Download with byte-level progress ────────────────────────────────
        val tempFile = File(context.cacheDir, "pdf_${url.hashCode()}.pdf")
        if (!tempFile.exists() || tempFile.length() == 0L) {
            val dlResult = withContext(Dispatchers.IO) {
                runCatching {
                    val conn = (java.net.URL(url).openConnection() as java.net.HttpURLConnection)
                        .also { it.connect() }
                    val totalBytes = conn.contentLengthLong
                    val buf = ByteArray(65_536)
                    var downloaded = 0L
                    FileOutputStream(tempFile).use { out ->
                        conn.inputStream.use { inp ->
                            while (true) {
                                val n = inp.read(buf)
                                if (n == -1) break
                                out.write(buf, 0, n)
                                downloaded += n
                                if (totalBytes > 0) {
                                    val pct = (downloaded.toFloat() / totalBytes).coerceIn(0f, 0.95f)
                                    withContext(Dispatchers.Main.immediate) { downloadProgress = pct }
                                }
                            }
                        }
                    }
                    conn.disconnect()
                }
            }
            if (dlResult.isFailure) {
                error = dlResult.exceptionOrNull()?.message ?: "Download failed"
                isLoading = false
                return@LaunchedEffect
            }
        } else {
            downloadProgress = 1f
        }

        // ── Open renderer ─────────────────────────────────────────────────────
        val result: Result<PaneInit> = withContext(Dispatchers.IO) {
            runCatching {
                var fd: ParcelFileDescriptor? = null
                var renderer: PdfRenderer?    = null
                try {
                    fd       = ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY)
                    renderer = PdfRenderer(fd)
                    PaneInit(tempFile.absolutePath, renderer.pageCount)
                } finally {
                    try { renderer?.close() } catch (_: Exception) {}
                    try { fd?.close()       } catch (_: Exception) {}
                }
            }
        }

        result.fold(
            onSuccess = { init ->
                filePath  = init.path
                pageCount = init.count
                onLoaded(init.count)
            },
            onFailure = { e ->
                error = e.message ?: "Failed to load PDF"
            }
        )
        isLoading = false
    }

    when {
        isLoading     -> PdfLoadingState(downloadProgress)
        error != null -> PdfErrorState(error!!) {}
        filePath != null -> {
            val bgColor   = if (nightMode) Color(0xFF424242) else Color.White
            val listState = rememberLazyListState()

            // ── Jump to page on request (e.g. from Go-to-Page dialog) ───────
            LaunchedEffect(scrollToPage) {
                val target = scrollToPage ?: return@LaunchedEffect
                if (pageCount > 0) {
                    listState.animateScrollToItem((target - 1).coerceIn(0, pageCount - 1))
                    onScrollConsumed()
                }
            }

            // Report current page via list state
            val currentIndex by remember { derivedStateOf { listState.firstVisibleItemIndex } }
            LaunchedEffect(currentIndex) { onPageChange(currentIndex) }

            // ── Pinch-to-zoom state ─────────────────────────────────────────
            var zoomScale by remember { mutableFloatStateOf(1f) }
            var zoomOffsetX by remember { mutableFloatStateOf(0f) }
            var zoomOffsetY by remember { mutableFloatStateOf(0f) }

            Box(modifier = modifier.clipToBounds()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(bgColor)
                        .graphicsLayer(
                            scaleX = zoomScale,
                            scaleY = zoomScale,
                            translationX = zoomOffsetX,
                            translationY = zoomOffsetY
                        )
                        .pointerInput(Unit) {
                            detectTransformGestures { _, pan, gestureZoom, _ ->
                                val newScale = (zoomScale * gestureZoom).coerceIn(1f, 4f)
                                zoomScale = newScale
                                zoomOffsetX = if (newScale > 1f) zoomOffsetX + pan.x else 0f
                                zoomOffsetY = if (newScale > 1f) zoomOffsetY + pan.y else 0f
                            }
                        }
                        .pointerInput(zoomScale) {
                            detectTapGestures(onDoubleTap = {
                                zoomScale = if (zoomScale > 1f) 1f else 2f
                                zoomOffsetX = 0f
                                zoomOffsetY = 0f
                            })
                        },
                    state    = listState,
                    userScrollEnabled = zoomScale <= 1f
                ) {
                    itemsIndexed(List(pageCount) { it }) { _, pageIndex ->
                        PdfPageItem(
                            filePath  = filePath!!,
                            pageIndex = pageIndex,
                            nightMode = nightMode,
                            rotation  = rotation
                        )
                    }
                }

                // Pane label overlay at the top (used in split view)
                if (paneTitle.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0x80000000))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                            .align(Alignment.TopStart)
                    ) {
                        Text(
                            text  = paneTitle,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Page counter badge at bottom-right (split view)
                if (paneTitle.isNotEmpty() && pageCount > 0) {
                    Surface(
                        color    = Color(0x66000000),
                        shape    = RoundedCornerShape(4.dp),
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(8.dp)
                    ) {
                        Text(
                            "${currentIndex + 1} / $pageCount",
                            color    = Color.White,
                            style    = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}

// ── Single page — rendered lazily when it enters the viewport ─────────────

@Composable
private fun PdfPageItem(
    filePath: String,
    pageIndex: Int,
    nightMode: Boolean,
    rotation: Int = 0
) {
    var bitmap    by remember(filePath, pageIndex) { mutableStateOf<Bitmap?>(null) }
    var pageError by remember(filePath, pageIndex) { mutableStateOf(false) }

    LaunchedEffect(filePath, pageIndex) {
        if (bitmap != null) return@LaunchedEffect

        val renderedBitmap: Bitmap? = withContext(Dispatchers.IO) {
            var fd: ParcelFileDescriptor? = null
            var renderer: PdfRenderer?    = null
            try {
                fd       = ParcelFileDescriptor.open(File(filePath), ParcelFileDescriptor.MODE_READ_ONLY)
                renderer = PdfRenderer(fd)
                if (pageIndex < renderer.pageCount) {
                    renderer.openPage(pageIndex).use { page ->
                        val scale = 3.0f
                        val w = (page.width  * scale).toInt()
                        val h = (page.height * scale).toInt()
                        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                        bmp.eraseColor(android.graphics.Color.WHITE)
                        page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        bmp
                    }
                } else null
            } catch (_: Exception) {
                null
            } finally {
                try { renderer?.close() } catch (_: Exception) {}
                try { fd?.close()       } catch (_: Exception) {}
            }
        }

        if (renderedBitmap != null) {
            bitmap    = renderedBitmap
            pageError = false
        } else {
            pageError = true
        }
    }

    val bgColor = if (nightMode) Color(0xFF424242) else Color.White
    when {
        bitmap != null -> Image(
            bitmap             = bitmap!!.asImageBitmap(),
            contentDescription = "Page ${pageIndex + 1}",
            modifier           = Modifier
                .fillMaxWidth()
                .background(bgColor)
                .padding(bottom = 2.dp)
                .rotate(rotation.toFloat()),
            contentScale       = ContentScale.FillWidth
        )
        pageError -> Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.707f)
                .background(bgColor),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Filled.BrokenImage, null,
                    tint     = MaterialTheme.colorScheme.error.copy(alpha = 0.6f),
                    modifier = Modifier.size(32.dp))
                Text(
                    "Page ${pageIndex + 1} failed to load",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        else -> Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(0.707f)
                .background(bgColor),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(modifier = Modifier.size(28.dp), strokeWidth = 2.dp)
        }
    }
}

// ── State composables ──────────────────────────────────────────────────────

@Composable
private fun PdfLoadingState(downloadProgress: Float = 0f) {
    val infiniteTransition = rememberInfiniteTransition(label = "pdf_shimmer")
    val shimmerX by infiniteTransition.animateFloat(
        initialValue = -800f,
        targetValue  =  800f,
        animationSpec = infiniteRepeatable(
            animation  = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "pdf_shimmer_x"
    )
    val baseColor      = MaterialTheme.colorScheme.surfaceVariant
    val highlightColor = MaterialTheme.colorScheme.surface

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Simulate PDF pages as skeleton rectangles (A4 ratio ≈ 0.707)
        repeat(3) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.707f)
                    .clip(RoundedCornerShape(4.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(baseColor, highlightColor, baseColor),
                            start  = Offset(shimmerX, 0f),
                            end    = Offset(shimmerX + 500f, 0f)
                        )
                    )
            )
        }
        // ── Download progress ────────────────────────────────────────────────
        if (downloadProgress in 0.01f..0.99f) {
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress   = { downloadProgress },
                modifier   = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                color      = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "${(downloadProgress * 100).toInt()}% downloaded",
                style    = MaterialTheme.typography.labelSmall,
                color    = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun PdfErrorState(error: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.errorContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Filled.ErrorOutline, null,
                modifier = Modifier.size(40.dp),
                tint     = MaterialTheme.colorScheme.error
            )
        }
        Spacer(Modifier.height(20.dp))
        Text(
            "Couldn't load PDF",
            style      = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(6.dp))
        Text(
            error,
            color    = MaterialTheme.colorScheme.onSurfaceVariant,
            style    = MaterialTheme.typography.bodySmall,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = onRetry,
            shape   = RoundedCornerShape(14.dp)
        ) {
            Icon(Icons.Filled.Refresh, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text("Try Again")
        }
    }
}
