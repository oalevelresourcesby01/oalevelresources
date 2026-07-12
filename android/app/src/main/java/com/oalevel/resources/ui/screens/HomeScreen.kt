package com.oalevel.resources.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.data.remote.Announcement
import com.oalevel.resources.data.remote.ResourceItem
import com.oalevel.resources.data.remote.ResourceNode
import com.oalevel.resources.ui.viewmodel.HomeViewModel

// ── Level card accent colours (cycling) ────────────────────────────────────
private val levelGradients = listOf(
    Brush.linearGradient(listOf(Color(0xFF43A047), Color(0xFF1B5E20))),
    Brush.linearGradient(listOf(Color(0xFF1E88E5), Color(0xFF0D47A1))),
    Brush.linearGradient(listOf(Color(0xFFF4511E), Color(0xFFBF360C))),
    Brush.linearGradient(listOf(Color(0xFF8E24AA), Color(0xFF4A148C))),
)
private val levelCardIcons = listOf(
    Icons.Filled.School, Icons.Filled.AutoStories,
    Icons.Filled.PlayCircle, Icons.Filled.Person
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onLevelClick: (ResourceNode) -> Unit,
    onSearchClick: () -> Unit,
    onDownloadsClick: () -> Unit,
    onFavouritesClick: () -> Unit,
    onRecentClick: () -> Unit,
    onContinueReadingClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onAiChatClick: () -> Unit,
    onResourceClick: (ResourceItem) -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(9.dp))
                                .background(Color.White),
                            contentAlignment = Alignment.Center
                        ) {
                            androidx.compose.foundation.Image(
                                painter = androidx.compose.ui.res.painterResource(
                                    com.oalevel.resources.R.drawable.ic_splash_logo_img
                                ),
                                contentDescription = "App logo",
                                contentScale = ContentScale.Fit,
                                modifier = Modifier.fillMaxSize().padding(4.dp)
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(
                                "O/A Level Resources",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 15.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                "Your study companion",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.8f),
                                maxLines = 1
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onSearchClick) {
                        Icon(Icons.Filled.Search, "Search", tint = Color.White)
                    }
                    IconButton(onClick = onSettingsClick) {
                        Icon(Icons.Filled.Settings, "Settings", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).background(
                MaterialTheme.colorScheme.background
            ),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            // ── Announcements ─────────────────────────────────────────────────
            if (uiState.announcements.isNotEmpty()) {
                item {
                    AnnouncementsSection(announcements = uiState.announcements)
                }
            }

            // ── Hero banner ───────────────────────────────────────────────────
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp, 16.dp, 16.dp, 8.dp)
                        .shadow(4.dp, RoundedCornerShape(20.dp))
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF1B5E20), Color(0xFF388E3C), Color(0xFF66BB6A))
                            )
                        )
                        .padding(20.dp)
                ) {
                    Column {
                        Text(
                            "📚 Ready to study?",
                            style = MaterialTheme.typography.labelLarge,
                            color = Color.White.copy(alpha = 0.85f),
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Browse resources, take notes,\nor ask the AI assistant.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White,
                            lineHeight = 20.sp
                        )
                        Spacer(Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = onSearchClick,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.White,
                                    contentColor = MaterialTheme.colorScheme.primary
                                ),
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Icon(Icons.Filled.Search, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Search", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                            OutlinedButton(
                                onClick = onAiChatClick,
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.6f)),
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Icon(Icons.Filled.SmartToy, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("AI Chat", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }

            // ── Quick actions row ─────────────────────────────────────────────
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    QuickAction(Icons.Filled.Download, "Downloads", onClick = onDownloadsClick)
                    QuickAction(Icons.Filled.Favorite, "Favourites", onClick = onFavouritesClick)
                    QuickAction(Icons.Filled.History, "Recent", onClick = onRecentClick)
                    if (uiState.config?.whatsappChannel?.isNotBlank() == true) {
                        val context = androidx.compose.ui.platform.LocalContext.current
                        val url = uiState.config!!.whatsappChannel
                        QuickAction(Icons.Filled.Forum, "WhatsApp", onClick = {
                            val intent = android.content.Intent(
                                android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)
                            )
                            context.startActivity(intent)
                        })
                    }
                }
            }

            // ── Section header ────────────────────────────────────────────────
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Browse by Level",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // ── Level cards grid ──────────────────────────────────────────────
            if (uiState.isLoadingLevels) {
                item {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
            } else {
                val levels = uiState.levels
                items(levels.chunked(2)) { row ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 5.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        row.forEachIndexed { _, level ->
                            val globalIdx = levels.indexOf(level)
                            LevelCard(
                                node    = level,
                                gradient = levelGradients[globalIdx % levelGradients.size],
                                icon    = levelCardIcons[globalIdx % levelCardIcons.size],
                                modifier = Modifier.weight(1f),
                                onClick  = { onLevelClick(level) }
                            )
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }

            // ── Latest resources ──────────────────────────────────────────────
            if (uiState.recentResources.isNotEmpty()) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Latest Resources",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = onRecentClick) {
                            Text("See all", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
                items(uiState.recentResources.take(5)) { resource ->
                    RecentResourceItem(resource = resource, onClick = { onResourceClick(resource) })
                }
            }

            // ── Error state ───────────────────────────────────────────────────
            uiState.error?.let { err ->
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Filled.WifiOff, null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(20.dp))
                            Text(
                                "Could not load content. $err",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.weight(1f)
                            )
                            TextButton(onClick = viewModel::refresh) { Text("Retry") }
                        }
                    }
                }
            }
        }
    }
}

// ── Quick action pill ───────────────────────────────────────────────────────

@Composable
private fun QuickAction(icon: ImageVector, label: String, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        FilledTonalIconButton(
            onClick = onClick,
            modifier = Modifier.size(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = IconButtonDefaults.filledTonalIconButtonColors(
                containerColor = MaterialTheme.colorScheme.secondaryContainer
            )
        ) {
            Icon(icon, null, modifier = Modifier.size(22.dp),
                tint = MaterialTheme.colorScheme.onSecondaryContainer)
        }
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1
        )
    }
}

// ── Level card ─────────────────────────────────────────────────────────────

@Composable
private fun LevelCard(
    node: ResourceNode,
    gradient: Brush,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .height(120.dp)
            .shadow(6.dp, RoundedCornerShape(18.dp))
            .clip(RoundedCornerShape(18.dp))
            .background(gradient)
            .clickable { onClick() }
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color.White.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = Color.White, modifier = Modifier.size(22.dp))
            }
            Column {
                Text(
                    node.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if ((node.childCount ?: 0) > 0) {
                    Text(
                        "${node.childCount} subjects",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
            }
        }
        // Arrow indicator
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.TopEnd
        ) {
            Icon(
                Icons.Filled.ArrowForward, null,
                tint = Color.White.copy(alpha = 0.5f),
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

// ── Announcements ──────────────────────────────────────────────────────────

@Composable
private fun AnnouncementsSection(announcements: List<Announcement>) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        announcements.take(3).forEach { ann ->
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFFFF8E1)
                ),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                border = BorderStroke(1.dp, Color(0xFFFFE082))
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFFFE082)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("📢", fontSize = 16.sp)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            ann.title,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF5D4037)
                        )
                        if (ann.message.isNotBlank()) {
                            Text(
                                ann.message,
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF795548),
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ── Recent resource list item ──────────────────────────────────────────────

@Composable
private fun RecentResourceItem(resource: ResourceItem, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFFFEBEE)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.PictureAsPdf, null,
                tint = Color(0xFFC62828), modifier = Modifier.size(24.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                resource.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                buildString {
                    resource.parentName?.let { append(it) }
                    resource.size?.let { append(" · ${formatFileSize(it)}") }
                },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
        Icon(
            Icons.Filled.ChevronRight, null,
            tint = MaterialTheme.colorScheme.outline,
            modifier = Modifier.size(18.dp)
        )
    }
    HorizontalDivider(
        modifier = Modifier.padding(start = 72.dp),
        color = MaterialTheme.colorScheme.outlineVariant
    )
}

private fun formatFileSize(bytes: Long): String = when {
    bytes >= 1_048_576 -> "%.1f MB".format(bytes / 1_048_576.0)
    bytes >= 1_024     -> "${bytes / 1_024} KB"
    else               -> "$bytes B"
}
