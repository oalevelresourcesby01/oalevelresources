package com.oalevel.resources.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.data.local.*
import com.oalevel.resources.ui.components.PremiumEmptyState
import com.oalevel.resources.ui.viewmodel.ContinueReadingViewModel
import com.oalevel.resources.ui.viewmodel.DownloadsViewModel
import com.oalevel.resources.ui.viewmodel.FavouritesViewModel
import com.oalevel.resources.ui.viewmodel.RecentViewModel

// ── Downloads Screen ──────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DownloadsScreen(
    onOpenPdf: (Download) -> Unit,
    onBack: () -> Unit,
    viewModel: DownloadsViewModel = hiltViewModel()
) {
    val downloads by viewModel.downloads.collectAsState(emptyList())

    val active = downloads.filter { it.status == "downloading" || it.status == "pending" }
    val done   = downloads.filter { it.status == "completed" }
    val failed = downloads.filter { it.status == "error" }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Downloads", fontWeight = FontWeight.Bold, color = Color.White)
                        if (downloads.isNotEmpty()) {
                            Text(
                                "${done.size} completed · ${active.size} active",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { padding ->
        if (downloads.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                PremiumEmptyState(
                    icon        = Icons.Filled.CloudDownload,
                    title       = "No downloads yet",
                    subtitle    = "PDF files you download will appear here for offline reading"
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // ── Downloading ───────────────────────────────────────────
                if (active.isNotEmpty()) {
                    item { DownloadGroupHeader("Downloading", active.size) }
                    items(active) { dl ->
                        DownloadCard(
                            download  = dl,
                            accentColor = Color(0xFF1565C0),
                            icon      = Icons.Filled.Downloading,
                            onClick   = {},
                            onDelete  = { viewModel.deleteDownload(dl.id) },
                            onRetry   = null
                        )
                    }
                    item { Spacer(Modifier.height(4.dp)) }
                }

                // ── Completed ─────────────────────────────────────────────
                if (done.isNotEmpty()) {
                    item { DownloadGroupHeader("Completed", done.size) }
                    items(done) { dl ->
                        DownloadCard(
                            download    = dl,
                            accentColor = Color(0xFF2E7D32),
                            icon        = Icons.Filled.CheckCircle,
                            onClick     = { onOpenPdf(dl) },
                            onDelete    = { viewModel.deleteDownload(dl.id) },
                            onRetry     = null
                        )
                    }
                    item { Spacer(Modifier.height(4.dp)) }
                }

                // ── Failed ────────────────────────────────────────────────
                if (failed.isNotEmpty()) {
                    item { DownloadGroupHeader("Failed", failed.size) }
                    items(failed) { dl ->
                        DownloadCard(
                            download    = dl,
                            accentColor = Color(0xFFC62828),
                            icon        = Icons.Filled.ErrorOutline,
                            onClick     = {},
                            onDelete    = { viewModel.deleteDownload(dl.id) },
                            onRetry     = { viewModel.retryDownload(dl.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DownloadGroupHeader(title: String, count: Int) {
    Row(
        modifier = Modifier.padding(vertical = 4.dp, horizontal = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            title.uppercase(),
            style      = MaterialTheme.typography.labelMedium,
            color      = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
        )
        Surface(
            color = MaterialTheme.colorScheme.primaryContainer,
            shape = CircleShape
        ) {
            Text(
                "$count",
                style      = MaterialTheme.typography.labelSmall,
                color      = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.Bold,
                modifier   = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
            )
        }
    }
}

@Composable
private fun DownloadCard(
    download: Download,
    accentColor: Color,
    icon: ImageVector,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    onRetry: (() -> Unit)?
) {
    ElevatedCard(
        onClick    = { if (download.status == "completed") onClick() },
        shape      = RoundedCornerShape(16.dp),
        elevation  = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp),
        modifier   = Modifier.fillMaxWidth()
    ) {
        Column {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(13.dp))
                        .background(accentColor.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, null, tint = accentColor, modifier = Modifier.size(24.dp))
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        download.name,
                        maxLines   = 2,
                        overflow   = TextOverflow.Ellipsis,
                        style      = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        when (download.status) {
                            "completed"   -> "Ready to read"
                            "downloading" -> "Downloading… ${download.progress}%"
                            "pending"     -> "Queued"
                            "error"       -> "Download failed"
                            else          -> download.status
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = accentColor
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    if (download.status == "completed") {
                        FilledTonalButton(
                            onClick      = onClick,
                            shape        = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(Icons.Filled.OpenInNew, null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Open", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    if (onRetry != null) {
                        OutlinedButton(
                            onClick        = onRetry,
                            shape          = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            colors         = ButtonDefaults.outlinedButtonColors(contentColor = accentColor)
                        ) {
                            Icon(Icons.Filled.Refresh, null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Retry", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Filled.Delete, "Delete",
                            tint     = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(18.dp))
                    }
                }
            }

            if (download.status == "downloading") {
                LinearProgressIndicator(
                    progress   = { download.progress / 100f },
                    modifier   = Modifier.fillMaxWidth().height(3.dp),
                    color      = Color(0xFF1565C0),
                    trackColor = Color(0xFFBBDEFB)
                )
            }
        }
    }
}

// ── Favourites Screen ─────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FavouritesScreen(
    onItemClick: (Favourite) -> Unit,
    onBack: () -> Unit,
    viewModel: FavouritesViewModel = hiltViewModel()
) {
    val favourites by viewModel.favourites.collectAsState(emptyList())

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Favourites", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { padding ->
        if (favourites.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                PremiumEmptyState(
                    icon     = Icons.Filled.FavoriteBorder,
                    title    = "No favourites yet",
                    subtitle = "Tap the heart icon on any PDF or folder to save it here"
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(favourites) { fav ->
                    val isFolder = fav.type == "folder"
                    FavouriteCard(
                        name       = fav.name,
                        parentPath = fav.parentPath,
                        isFolder   = isFolder,
                        onOpen     = { onItemClick(fav) },
                        onRemove   = { viewModel.remove(fav.resourceId) }
                    )
                }
            }
        }
    }
}

@Composable
private fun FavouriteCard(
    name: String,
    parentPath: String,
    isFolder: Boolean,
    onOpen: () -> Unit,
    onRemove: () -> Unit
) {
    ElevatedCard(
        onClick   = onOpen,
        shape     = RoundedCornerShape(14.dp),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp),
        modifier  = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(13.dp))
                    .background(
                        if (isFolder) Color(0xFF2E7D32) else Color(0xFFC62828)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isFolder) Icons.Filled.Folder else Icons.Filled.PictureAsPdf,
                    null,
                    tint     = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    name,
                    style      = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines   = 1,
                    overflow   = TextOverflow.Ellipsis
                )
                if (parentPath.isNotBlank()) {
                    Text(
                        parentPath,
                        style    = MaterialTheme.typography.labelSmall,
                        color    = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
            IconButton(onClick = onRemove, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Filled.Favorite, null,
                    tint     = Color(0xFFE53935),
                    modifier = Modifier.size(20.dp))
            }
        }
    }
}

// ── Recent Screen ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecentScreen(
    onItemClick: (RecentViewed) -> Unit,
    onBack: () -> Unit,
    viewModel: RecentViewModel = hiltViewModel()
) {
    val items by viewModel.recentItems.collectAsState(emptyList())

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Recently Viewed", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { padding ->
        if (items.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                PremiumEmptyState(
                    icon     = Icons.Filled.History,
                    title    = "Nothing viewed yet",
                    subtitle = "Resources you open will appear here for quick access"
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(items) { item ->
                    val isFolder = item.type == "folder"
                    ElevatedCard(
                        onClick   = { onItemClick(item) },
                        shape     = RoundedCornerShape(14.dp),
                        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp),
                        modifier  = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(RoundedCornerShape(13.dp))
                                    .background(if (isFolder) Color(0xFF2E7D32) else Color(0xFFC62828)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    if (isFolder) Icons.Filled.Folder else Icons.Filled.PictureAsPdf,
                                    null,
                                    tint     = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                            Text(
                                item.name,
                                style      = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                maxLines   = 2,
                                overflow   = TextOverflow.Ellipsis,
                                modifier   = Modifier.weight(1f)
                            )
                            Icon(
                                Icons.Filled.ChevronRight, null,
                                tint     = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ── Continue Reading Screen ───────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContinueReadingScreen(
    onPdfClick: (ReadingProgress) -> Unit,
    onBack: () -> Unit,
    viewModel: ContinueReadingViewModel = hiltViewModel()
) {
    val items by viewModel.progressItems.collectAsState(emptyList())

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Continue Reading", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { padding ->
        if (items.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                PremiumEmptyState(
                    icon     = Icons.Filled.MenuBook,
                    title    = "Nothing in progress",
                    subtitle = "Open a PDF to start tracking your reading progress"
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(items) { prog ->
                    val pct = if (prog.totalPages > 0)
                        ((prog.currentPage + 1).toFloat() / prog.totalPages * 100).toInt() else 0
                    val progressFraction = if (prog.totalPages > 0)
                        (prog.currentPage + 1f) / prog.totalPages else 0f
                    val pctColor = if (pct >= 80) MaterialTheme.colorScheme.primary
                                   else MaterialTheme.colorScheme.onSurfaceVariant

                    ElevatedCard(
                        onClick   = { onPdfClick(prog) },
                        shape     = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp),
                        modifier  = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(RoundedCornerShape(13.dp))
                                        .background(
                                            Brush.linearGradient(
                                                listOf(Color(0xFFE53935), Color(0xFFC62828))
                                            )
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Filled.MenuBook, null,
                                        tint     = Color.White,
                                        modifier = Modifier.size(22.dp))
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        prog.name,
                                        maxLines   = 1,
                                        overflow   = TextOverflow.Ellipsis,
                                        fontWeight = FontWeight.Medium,
                                        style      = MaterialTheme.typography.bodyMedium
                                    )
                                    Spacer(Modifier.height(2.dp))
                                    Text(
                                        "Page ${prog.currentPage + 1} of ${prog.totalPages} · ${timeAgo(prog.lastReadAt)}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Text(
                                    "$pct%",
                                    style      = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color      = pctColor
                                )
                            }
                            Spacer(Modifier.height(10.dp))
                            LinearProgressIndicator(
                                progress   = { progressFraction },
                                modifier   = Modifier.fillMaxWidth().height(5.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color      = MaterialTheme.colorScheme.primary,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun timeAgo(epochMillis: Long): String {
    val diff = System.currentTimeMillis() - epochMillis
    return when {
        diff < 60_000L         -> "just now"
        diff < 3_600_000L      -> "${diff / 60_000}m ago"
        diff < 86_400_000L     -> "${diff / 3_600_000}h ago"
        diff < 7 * 86_400_000L -> "${diff / 86_400_000}d ago"
        else                   -> "${diff / (7 * 86_400_000L)}w ago"
    }
}

// ── Settings Screen ───────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    isDark: Boolean = false,
    onToggleDark: () -> Unit = {}
) {
    val context = LocalContext.current

    var cacheSize by remember { mutableStateOf("…") }
    LaunchedEffect(Unit) {
        val bytes = context.cacheDir.walkTopDown().sumOf { it.length() }
        cacheSize = "%.1f MB".format(bytes / 1_048_576.0)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {

            // ── App identity header ────────────────────────────────────────
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    MaterialTheme.colorScheme.primary,
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.85f)
                                )
                            )
                        )
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(RoundedCornerShape(22.dp))
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.MenuBook, null,
                                tint     = Color.White,
                                modifier = Modifier.size(40.dp))
                        }
                        Text(
                            "O/A Level Resources",
                            style      = MaterialTheme.typography.titleMedium,
                            color      = Color.White,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Surface(
                            color = Color.White.copy(alpha = 0.18f),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(
                                "Version 1.0.0",
                                style    = MaterialTheme.typography.labelSmall,
                                color    = Color.White,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            // ── Appearance section ─────────────────────────────────────────
            item { SettingsGroupLabel("Appearance") }
            item {
                SettingsCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    SettingsSwitch(
                        icon     = Icons.Filled.DarkMode,
                        iconBg   = Color(0xFF37474F),
                        title    = "Dark Mode",
                        subtitle = if (isDark) "Dark theme is active" else "Light theme is active",
                        checked  = isDark,
                        onToggle = { onToggleDark() },
                        showDivider = false
                    )
                }
            }

            // ── Storage section ────────────────────────────────────────────
            item { SettingsGroupLabel("Storage") }
            item {
                SettingsCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    SettingsRow(
                        icon        = Icons.Filled.Storage,
                        iconBg      = Color(0xFF6A1B9A),
                        title       = "Cache Used",
                        subtitle    = cacheSize,
                        onClick     = null,
                        showDivider = true
                    )
                    SettingsRow(
                        icon     = Icons.Filled.CleaningServices,
                        iconBg   = Color(0xFFE65100),
                        title    = "Clear Cache",
                        subtitle = "Remove temporarily cached data",
                        showDivider = false,
                        onClick  = {
                            context.cacheDir.walkTopDown()
                                .filter { it.isFile }
                                .forEach { it.delete() }
                            cacheSize = "0.0 MB"
                        }
                    )
                }
            }

            // ── Network section ────────────────────────────────────────────
            item { SettingsGroupLabel("Network") }
            item {
                SettingsCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    SettingsRow(
                        icon        = Icons.Filled.Cloud,
                        iconBg      = Color(0xFF1565C0),
                        title       = "Backend Server",
                        subtitle    = "oalevelresources.onrender.com",
                        onClick     = null,
                        showDivider = false
                    )
                }
            }

            // ── Community section ──────────────────────────────────────────
            item { SettingsGroupLabel("Community") }
            item {
                SettingsCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    SettingsRow(
                        icon     = Icons.Filled.Chat,
                        iconBg   = Color(0xFF2E7D32),
                        title    = "WhatsApp Community",
                        subtitle = "Join our student group",
                        showDivider = false,
                        onClick  = {
                            runCatching {
                                val uri = Uri.parse("https://chat.whatsapp.com/invite")
                                context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                            }
                        }
                    )
                }
            }

            // ── About section ──────────────────────────────────────────────
            item { SettingsGroupLabel("About") }
            item {
                SettingsCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                    SettingsRow(
                        icon        = Icons.Filled.Info,
                        iconBg      = Color(0xFF1565C0),
                        title       = "App Version",
                        subtitle    = "O/A Level Resources 1.0.0",
                        onClick     = null,
                        showDivider = false
                    )
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}

@Composable
private fun SettingsGroupLabel(label: String) {
    Text(
        label.uppercase(),
        style      = MaterialTheme.typography.labelSmall,
        color      = MaterialTheme.colorScheme.primary,
        fontWeight = FontWeight.Bold,
        modifier   = Modifier.padding(start = 20.dp, top = 20.dp, bottom = 6.dp, end = 16.dp)
    )
}

@Composable
private fun SettingsCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    ElevatedCard(
        modifier  = modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(16.dp),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp)
    ) {
        Column(content = content)
    }
}

@Composable
private fun SettingsRow(
    icon: ImageVector,
    iconBg: Color,
    title: String,
    subtitle: String,
    showDivider: Boolean,
    onClick: (() -> Unit)?
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBg),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(20.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(title,
                style      = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium)
            if (subtitle.isNotBlank()) {
                Text(subtitle,
                    style    = MaterialTheme.typography.bodySmall,
                    color    = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 1.dp))
            }
        }
        if (onClick != null) {
            Icon(Icons.Filled.ChevronRight, null,
                tint     = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp))
        }
    }
    if (showDivider) {
        HorizontalDivider(modifier = Modifier.padding(start = 70.dp))
    }
}

@Composable
private fun SettingsSwitch(
    icon: ImageVector,
    iconBg: Color,
    title: String,
    subtitle: String,
    checked: Boolean,
    onToggle: (Boolean) -> Unit,
    showDivider: Boolean
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggle(!checked) }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconBg),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(20.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(title,
                style      = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium)
            Text(subtitle,
                style    = MaterialTheme.typography.bodySmall,
                color    = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 1.dp))
        }
        Switch(checked = checked, onCheckedChange = onToggle)
    }
    if (showDivider) {
        HorizontalDivider(modifier = Modifier.padding(start = 70.dp))
    }
}

// ── Shared empty state (legacy — kept for API compatibility) ──────────────────

@Composable
fun EmptyState(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    message: String
) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        PremiumEmptyState(
            icon     = icon,
            title    = message,
            subtitle = ""
        )
    }
}
