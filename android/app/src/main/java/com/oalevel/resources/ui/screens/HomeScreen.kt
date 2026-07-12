package com.oalevel.resources.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
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
private val levelCardBg = listOf(
    Color(0xFFE8F5E9), Color(0xFFE3F2FD),
    Color(0xFFFFF8E1), Color(0xFFFCE4EC)
)
private val levelCardFg = listOf(
    Color(0xFF1B5E20), Color(0xFF1565C0),
    Color(0xFFF57F17), Color(0xFF880E4F)
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
                                contentScale = androidx.compose.ui.layout.ContentScale.Fit,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(4.dp)
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(
                                "O/A Level Resources",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 15.sp
                            )
                            Text(
                                "Your study companion",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.8f)
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
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(bottom = 0.dp)
        ) {
            // Announcements
            if (uiState.announcements.isNotEmpty()) {
                item {
                    AnnouncementsSection(announcements = uiState.announcements)
                }
            }

            // Section header
            item {
                Text(
                    text = "Browse by Level",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            // Level cards grid (2 per row)
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
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        row.forEachIndexed { colIdx, level ->
                            val globalIdx = levels.indexOf(level)
                            LevelCard(
                                node    = level,
                                bgColor = levelCardBg[globalIdx % levelCardBg.size],
                                fgColor = levelCardFg[globalIdx % levelCardFg.size],
                                icon    = levelCardIcons[globalIdx % levelCardIcons.size],
                                modifier = Modifier.weight(1f),
                                onClick  = { onLevelClick(level) }
                            )
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }

            // WhatsApp + AI mini cards
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // WhatsApp card
                    if (uiState.config?.whatsappChannel?.isNotBlank() == true) {
                        val context = androidx.compose.ui.platform.LocalContext.current
                        val url = uiState.config!!.whatsappChannel
                        Card(
                            onClick = {
                                val intent = android.content.Intent(
                                    android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)
                                )
                                context.startActivity(intent)
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                            border = BorderStroke(1.dp, Color(0xFFC8E6C9))
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("💬 WhatsApp Channel",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1B5E20))
                                Text("Get updates & announcements",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF388E3C),
                                    modifier = Modifier.padding(top = 2.dp))
                            }
                        }
                    }
                    // AI card
                    Card(
                        onClick = onAiChatClick,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFEDE7F6)),
                        border = BorderStroke(1.dp, Color(0xFFD1C4E9))
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("🤖 AI Assistant",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4527A0))
                            Text("Ask any O/A Level question",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF5E35B1),
                                modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                }
            }

            // Latest resources
            if (uiState.recentResources.isNotEmpty()) {
                item {
                    Text(
                        text = "Latest Resources",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )
                }
                items(uiState.recentResources.take(5)) { resource ->
                    RecentResourceItem(resource = resource, onClick = { onResourceClick(resource) })
                }
            }

            // Error state
            uiState.error?.let { err ->
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Filled.WifiOff, null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(18.dp))
                        Text(
                            "Could not load content. $err",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = viewModel::refresh) { Text("Retry") }
                    }
                }
            }

            item { Spacer(Modifier.height(8.dp)) }
        }
    }
}

// ── Level card ─────────────────────────────────────────────────────────────

@Composable
private fun LevelCard(
    node: ResourceNode,
    bgColor: Color,
    fgColor: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = modifier.height(112.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(14.dp),
            verticalArrangement = Arrangement.Bottom
        ) {
            Icon(icon, null, tint = fgColor, modifier = Modifier.size(26.dp))
            Spacer(Modifier.height(8.dp))
            Text(
                node.name,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = fgColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if ((node.childCount ?: 0) > 0) {
                Text(
                    "${node.childCount} subjects",
                    style = MaterialTheme.typography.labelSmall,
                    color = fgColor.copy(alpha = 0.75f)
                )
            }
        }
    }
}

// ── Announcements ──────────────────────────────────────────────────────────

@Composable
private fun AnnouncementsSection(announcements: List<Announcement>) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        announcements.take(3).forEach { ann ->
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("📢", fontSize = 18.sp)
                    Column {
                        Text(
                            ann.title,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        if (ann.message.isNotBlank()) {
                            Text(
                                ann.message,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
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
    ListItem(
        headlineContent = {
            Text(
                resource.name,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        },
        supportingContent = {
            Text(
                buildString {
                    resource.parentName?.let { append(it) }
                    resource.size?.let { append(" · ${formatFileSize(it)}") }
                },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        leadingContent = {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFFFEBEE)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.PictureAsPdf, null,
                    tint = Color(0xFFC62828), modifier = Modifier.size(22.dp))
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    )
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
