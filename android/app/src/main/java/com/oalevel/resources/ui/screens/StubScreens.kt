package com.oalevel.resources.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.data.local.*
import com.oalevel.resources.ui.viewmodel.DownloadsViewModel
import com.oalevel.resources.ui.viewmodel.FavouritesViewModel
import com.oalevel.resources.ui.viewmodel.RecentViewModel
import com.oalevel.resources.ui.viewmodel.ContinueReadingViewModel

// ── Downloads Screen ──────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DownloadsScreen(
    onOpenPdf: (Download) -> Unit,
    onBack: () -> Unit,
    viewModel: DownloadsViewModel = hiltViewModel()
) {
    val downloads by viewModel.downloads.collectAsState(emptyList())

    val active   = downloads.filter { it.status == "downloading" || it.status == "pending" }
    val done     = downloads.filter { it.status == "completed" }
    val failed   = downloads.filter { it.status == "error" }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Downloads") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor    = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (downloads.isEmpty()) {
            EmptyState(
                modifier = Modifier.padding(padding),
                icon = Icons.Filled.Download,
                message = "No downloads yet"
            )
        } else {
            LazyColumn(modifier = Modifier.padding(padding)) {

                // ── Downloading ──────────────────────────────────────────
                if (active.isNotEmpty()) {
                    item { DownloadSectionHeader("Downloading") }
                    items(active) { dl ->
                        DownloadItem(
                            download  = dl,
                            iconBg    = Color(0xFF1565C0),
                            icon      = Icons.Filled.Downloading,
                            onClick   = {},
                            onDelete  = { viewModel.deleteDownload(dl.id) },
                            onRetry   = null
                        )
                    }
                }

                // ── Downloaded ───────────────────────────────────────────
                if (done.isNotEmpty()) {
                    item { DownloadSectionHeader("Downloaded") }
                    items(done) { dl ->
                        DownloadItem(
                            download  = dl,
                            iconBg    = Color(0xFF2E7D32),
                            icon      = Icons.Filled.CheckCircle,
                            onClick   = { onOpenPdf(dl) },
                            onDelete  = { viewModel.deleteDownload(dl.id) },
                            onRetry   = null
                        )
                    }
                }

                // ── Failed ───────────────────────────────────────────────
                if (failed.isNotEmpty()) {
                    item { DownloadSectionHeader("Failed") }
                    items(failed) { dl ->
                        DownloadItem(
                            download  = dl,
                            iconBg    = Color(0xFFC62828),
                            icon      = Icons.Filled.ErrorOutline,
                            onClick   = {},
                            onDelete  = { viewModel.deleteDownload(dl.id) },
                            onRetry   = { viewModel.retryDownload(dl.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DownloadSectionHeader(title: String) {
    Text(
        text     = title.uppercase(),
        style    = MaterialTheme.typography.labelMedium,
        color    = MaterialTheme.colorScheme.primary,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
    )
}

@Composable
private fun DownloadItem(
    download: Download,
    iconBg: Color,
    icon: ImageVector,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    onRetry: (() -> Unit)?
) {
    Column(modifier = Modifier
        .fillMaxWidth()
        .clickable(enabled = download.status == "completed") { onClick() }
    ) {
        ListItem(
            headlineContent   = { Text(download.name, maxLines = 2) },
            supportingContent = {
                Text(
                    download.status.replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.labelSmall,
                    color = when (download.status) {
                        "completed"                     -> MaterialTheme.colorScheme.primary
                        "error"                         -> MaterialTheme.colorScheme.error
                        "downloading"                   -> Color(0xFF1565C0)
                        else                            -> MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            },
            leadingContent = {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(iconBg, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, null, tint = Color.White, modifier = Modifier.size(22.dp))
                }
            },
            trailingContent = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (download.status == "completed") {
                        AssistChip(
                            onClick = onClick,
                            label   = { Text("Open") },
                            leadingIcon = {
                                Icon(Icons.Filled.OpenInNew, null,
                                    modifier = Modifier.size(16.dp))
                            },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        )
                        Spacer(Modifier.width(4.dp))
                    }
                    if (onRetry != null) {
                        AssistChip(
                            onClick = onRetry,
                            label   = { Text("Retry") },
                            leadingIcon = {
                                Icon(Icons.Filled.Refresh, null,
                                    modifier = Modifier.size(16.dp))
                            },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer,
                                labelColor     = MaterialTheme.colorScheme.error,
                                leadingIconContentColor = MaterialTheme.colorScheme.error
                            )
                        )
                        Spacer(Modifier.width(4.dp))
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Filled.Delete, "Delete",
                            tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        )
        // Inline progress bar for active downloads
        if (download.status == "downloading") {
            LinearProgressIndicator(
                progress = { download.progress / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(3.dp),
                color      = Color(0xFF1565C0),
                trackColor = Color(0xFFBBDEFB)
            )
            Spacer(Modifier.height(4.dp))
        }
        HorizontalDivider()
    }
}

// ── Favourites Screen ─────────────────────────────────────────────────────

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
                title = { Text("Favourites") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor    = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (favourites.isEmpty()) {
            EmptyState(Modifier.padding(padding), Icons.Filled.FavoriteBorder,
                "No favourites yet. Tap the heart icon on any PDF.")
        } else {
            LazyColumn(modifier = Modifier.padding(padding)) {
                items(favourites) { fav ->
                    val isFolder = fav.type == "folder"
                    ListItem(
                        headlineContent = { Text(fav.name) },
                        supportingContent = {
                            Text(fav.parentPath,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        },
                        leadingContent = {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(
                                        if (isFolder) Color(0xFF2E7D32) else Color(0xFFC62828),
                                        RoundedCornerShape(10.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    if (isFolder) Icons.Filled.Folder else Icons.Filled.PictureAsPdf,
                                    null,
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        },
                        trailingContent = {
                            IconButton(onClick = { viewModel.remove(fav.resourceId) }) {
                                // Filled red heart = "saved", tapping removes it
                                Icon(Icons.Filled.Favorite, null,
                                    tint = Color(0xFFE53935))
                            }
                        },
                        modifier = Modifier.clip(RoundedCornerShape(8.dp))
                            .clickable { onItemClick(fav) }
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

// ── Recent Screen ─────────────────────────────────────────────────────────

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
                title = { Text("Recently Viewed") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor    = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (items.isEmpty()) {
            EmptyState(Modifier.padding(padding), Icons.Filled.History, "Nothing viewed yet")
        } else {
            LazyColumn(modifier = Modifier.padding(padding)) {
                items(items) { item ->
                    val isFolder = item.type == "folder"
                    ListItem(
                        headlineContent = { Text(item.name) },
                        leadingContent = {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(
                                        if (isFolder) Color(0xFF2E7D32) else Color(0xFFC62828),
                                        RoundedCornerShape(10.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    if (isFolder) Icons.Filled.Folder else Icons.Filled.PictureAsPdf,
                                    null,
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        },
                        modifier = Modifier.clickable { onItemClick(item) }
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

// ── Continue Reading Screen ───────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContinueReadingScreen(
    onPdfClick: (com.oalevel.resources.data.local.ReadingProgress) -> Unit,
    onBack: () -> Unit,
    viewModel: ContinueReadingViewModel = hiltViewModel()
) {
    val items by viewModel.progressItems.collectAsState(emptyList())

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Continue Reading") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor    = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (items.isEmpty()) {
            EmptyState(Modifier.padding(padding), Icons.Filled.MenuBook,
                "Start reading a PDF to track your progress")
        } else {
            LazyColumn(modifier = Modifier.padding(padding)) {
                items(items) { prog ->
                    val pct = if (prog.totalPages > 0)
                        ((prog.currentPage + 1).toFloat() / prog.totalPages * 100).toInt() else 0
                    val pctColor = if (pct >= 80) MaterialTheme.colorScheme.primary
                                   else MaterialTheme.colorScheme.onSurfaceVariant

                    ListItem(
                        headlineContent = { Text(prog.name, maxLines = 2) },
                        supportingContent = {
                            Column {
                                Text(
                                    "Page ${prog.currentPage + 1} of ${prog.totalPages} · ${timeAgo(prog.lastReadAt)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(Modifier.height(4.dp))
                                LinearProgressIndicator(
                                    progress = {
                                        if (prog.totalPages > 0)
                                            (prog.currentPage + 1f) / prog.totalPages
                                        else 0f
                                    },
                                    modifier = Modifier.fillMaxWidth().height(3.dp),
                                    color    = MaterialTheme.colorScheme.primary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            }
                        },
                        leadingContent = {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color(0xFFC62828), RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Filled.MenuBook, null,
                                    tint = Color.White, modifier = Modifier.size(22.dp))
                            }
                        },
                        trailingContent = {
                            Text(
                                "$pct%",
                                style = MaterialTheme.typography.labelLarge,
                                color = pctColor,
                                fontWeight = FontWeight.Bold
                            )
                        },
                        modifier = Modifier.clickable { onPdfClick(prog) }
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

private fun timeAgo(epochMillis: Long): String {
    val diff = System.currentTimeMillis() - epochMillis
    return when {
        diff < 60_000L          -> "just now"
        diff < 3_600_000L       -> "${diff / 60_000}m ago"
        diff < 86_400_000L      -> "${diff / 3_600_000}h ago"
        diff < 7 * 86_400_000L  -> "${diff / 86_400_000}d ago"
        else                    -> "${diff / (7 * 86_400_000L)}w ago"
    }
}

// ── Settings Screen ───────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    isDark: Boolean = false,
    onToggleDark: () -> Unit = {}
) {
    val context = LocalContext.current

    // Calculate cache size on composition
    val cacheMB = remember {
        val bytes = context.cacheDir.walkTopDown().sumOf { it.length() }
        "%.1f".format(bytes / 1_048_576.0)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor    = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding)) {

            // ── Identity header ───────────────────────────────────────
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primary)
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Filled.MenuBook, null,
                            tint = Color.White,
                            modifier = Modifier.size(52.dp)
                        )
                        Text(
                            "O/A Level Resources",
                            style = MaterialTheme.typography.titleMedium,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Version 1.0.0",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }
            }

            // ── Appearance ────────────────────────────────────────────
            item {
                Text(
                    "APPEARANCE",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                )
            }

            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .background(Color(0xFF37474F), androidx.compose.foundation.shape.RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.DarkMode, null,
                            tint = Color.White, modifier = Modifier.size(20.dp))
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Dark Mode",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium)
                        Text(
                            if (isDark) "Dark theme active" else "Light theme active",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(checked = isDark, onCheckedChange = { onToggleDark() })
                }
                HorizontalDivider()
            }

            // ── General ───────────────────────────────────────────────
            item {
                Text(
                    "GENERAL",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                )
            }

            item {
                SettingRow(
                    icon     = Icons.Filled.Cloud,
                    iconBg   = Color(0xFF1565C0),
                    title    = "Backend URL",
                    subtitle = "oalevelresources.onrender.com",
                    onClick  = null
                )
            }

            item {
                SettingRow(
                    icon     = Icons.Filled.Storage,
                    iconBg   = Color(0xFF6A1B9A),
                    title    = "Cache Used",
                    subtitle = "$cacheMB MB",
                    onClick  = null
                )
            }

            item {
                SettingRow(
                    icon     = Icons.Filled.CleaningServices,
                    iconBg   = Color(0xFFE65100),
                    title    = "Clear Cache",
                    subtitle = "Remove temporarily cached data",
                    onClick  = {
                        context.cacheDir.walkTopDown()
                            .filter { it.isFile }
                            .forEach { it.delete() }
                    }
                )
                HorizontalDivider()
            }

            // ── About ─────────────────────────────────────────────────
            item {
                Text(
                    "ABOUT",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                )
            }

            item {
                SettingRow(
                    icon     = Icons.Filled.Chat,
                    iconBg   = Color(0xFF2E7D32),
                    title    = "WhatsApp Community",
                    subtitle = "Join our student group",
                    onClick  = {
                        runCatching {
                            val uri = Uri.parse("https://chat.whatsapp.com/invite")
                            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                        }
                    }
                )
            }

            item {
                SettingRow(
                    icon     = Icons.Filled.Info,
                    iconBg   = Color(0xFF1565C0),
                    title    = "About",
                    subtitle = "O/A Level Resources v1.0.0",
                    onClick  = null
                )
            }
        }
    }
}

@Composable
private fun SettingRow(
    icon: ImageVector,
    iconBg: Color,
    title: String,
    subtitle: String,
    onClick: (() -> Unit)?
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(iconBg, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(22.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            if (subtitle.isNotBlank()) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (onClick != null) {
            Icon(Icons.Filled.ChevronRight, null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ── Shared ────────────────────────────────────────────────────────────────

@Composable
fun EmptyState(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    message: String
) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null,
                modifier = Modifier.size(72.dp),
                tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
            Spacer(Modifier.height(16.dp))
            Text(message,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium)
        }
    }
}
