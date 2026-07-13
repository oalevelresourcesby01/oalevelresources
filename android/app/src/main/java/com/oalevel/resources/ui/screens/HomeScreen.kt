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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.oalevel.resources.R
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.data.local.ReadingProgress
import com.oalevel.resources.data.remote.Announcement
import com.oalevel.resources.data.remote.ResourceItem
import com.oalevel.resources.data.remote.ResourceNode
import com.oalevel.resources.ui.components.SkeletonBox
import com.oalevel.resources.ui.viewmodel.ContinueReadingViewModel
import com.oalevel.resources.ui.viewmodel.HomeViewModel

// ── Level card accent colours ────────────────────────────────────────────────
private val levelGradients = listOf(
    Brush.linearGradient(listOf(Color(0xFF1B5E20), Color(0xFF388E3C))),
    Brush.linearGradient(listOf(Color(0xFF1565C0), Color(0xFF1E88E5))),
    Brush.linearGradient(listOf(Color(0xFFBF360C), Color(0xFFF4511E))),
    Brush.linearGradient(listOf(Color(0xFF4A148C), Color(0xFF8E24AA))),
    Brush.linearGradient(listOf(Color(0xFF006064), Color(0xFF00ACC1))),
    Brush.linearGradient(listOf(Color(0xFF37474F), Color(0xFF78909C))),
)
private val levelCardIcons = listOf(
    Icons.Filled.School, Icons.Filled.AutoStories,
    Icons.Filled.Science, Icons.Filled.Calculate,
    Icons.Filled.Language, Icons.Filled.HistoryEdu
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
    onDashboardClick: () -> Unit = {},
    onResourceClick: (ResourceItem) -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val continueViewModel: ContinueReadingViewModel = hiltViewModel()
    val progressItems by continueViewModel.progressItems.collectAsState(emptyList())

    // Time-aware greeting
    val hour = remember { java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY) }
    val greeting = when {
        hour in 5..11 -> "Good morning"
        hour in 12..16 -> "Good afternoon"
        else -> "Good evening"
    }
    val studyTip = remember {
        listOf(
            "Consistency beats cramming — 30 min/day adds up.",
            "Past papers are your best exam prep tool.",
            "Explain concepts out loud to solidify them.",
            "Take breaks — your brain consolidates during rest.",
            "Focus on weak topics first, then revise strengths.",
        ).random()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Image(
                                painter = painterResource(R.drawable.ic_splash_logo_img),
                                contentDescription = "App logo",
                                modifier = Modifier.size(26.dp),
                                contentScale = ContentScale.Fit
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
        },
        contentWindowInsets = WindowInsets(0)
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            // ── Announcements ─────────────────────────────────────────────
            if (uiState.announcements.isNotEmpty()) {
                item {
                    AnnouncementsSection(announcements = uiState.announcements)
                }
            }

            // ── Hero banner ───────────────────────────────────────────────
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp, 16.dp, 16.dp, 8.dp)
                        .shadow(6.dp, RoundedCornerShape(22.dp))
                        .clip(RoundedCornerShape(22.dp))
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF1B5E20), Color(0xFF2E7D32), Color(0xFF43A047))
                            )
                        )
                        .padding(20.dp)
                ) {
                    Column {
                        Text(
                            "$greeting! 👋",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Browse resources, take notes,\nor ask the AI assistant.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.9f),
                            lineHeight = 20.sp
                        )
                        Spacer(Modifier.height(6.dp))
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.White.copy(alpha = 0.15f))
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Filled.Lightbulb, null,
                                tint = Color(0xFFFFE082), modifier = Modifier.size(14.dp))
                            Text(
                                studyTip,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White.copy(alpha = 0.9f),
                                maxLines = 2
                            )
                        }
                        Spacer(Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = onSearchClick,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.White,
                                    contentColor = MaterialTheme.colorScheme.primary
                                ),
                                shape = RoundedCornerShape(14.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                            ) {
                                Icon(Icons.Filled.Search, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Search", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                            OutlinedButton(
                                onClick = onAiChatClick,
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                border = BorderStroke(1.5.dp, Color.White.copy(alpha = 0.7f)),
                                shape = RoundedCornerShape(14.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                            ) {
                                Icon(Icons.Filled.SmartToy, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("AI Chat", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }

            // ── Quick actions row ─────────────────────────────────────────
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    QuickAction(Icons.Filled.Download, "Downloads", Color(0xFF1565C0), onClick = onDownloadsClick)
                    QuickAction(Icons.Filled.Favorite, "Favourites", Color(0xFFC62828), onClick = onFavouritesClick)
                    QuickAction(Icons.Filled.History, "Recent", Color(0xFF4A148C), onClick = onRecentClick)
                    QuickAction(Icons.Filled.Dashboard, "Dashboard", Color(0xFF006064), onClick = onDashboardClick)
                    if (uiState.config?.whatsappChannel?.isNotBlank() == true) {
                        val context = androidx.compose.ui.platform.LocalContext.current
                        val url = uiState.config!!.whatsappChannel
                        QuickAction(Icons.Filled.Forum, "WhatsApp", Color(0xFF2E7D32), onClick = {
                            val intent = android.content.Intent(
                                android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)
                            )
                            context.startActivity(intent)
                        })
                    }
                }
            }

            // ── Continue Reading section ───────────────────────────────────
            if (progressItems.isNotEmpty()) {
                item {
                    SectionHeader(
                        title = "Continue Reading",
                        icon = Icons.Filled.MenuBook,
                        onSeeAll = onContinueReadingClick
                    )
                }
                item {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(progressItems.take(5)) { prog ->
                            ContinueReadingCard(
                                progress = prog,
                                onClick = onContinueReadingClick
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }

            // ── Browse by Level header ─────────────────────────────────────
            item {
                SectionHeader(
                    title = "Browse by Level",
                    icon = Icons.Filled.School,
                    onSeeAll = null
                )
            }

            // ── Level cards ───────────────────────────────────────────────
            if (uiState.isLoadingLevels) {
                item {
                    repeat(2) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 5.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            repeat(2) {
                                SkeletonBox(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(130.dp),
                                    shape    = RoundedCornerShape(18.dp)
                                )
                            }
                        }
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

            // ── Latest Resources ──────────────────────────────────────────
            if (uiState.recentResources.isNotEmpty()) {
                item {
                    SectionHeader(
                        title = "Latest Resources",
                        icon = Icons.Filled.NewReleases,
                        onSeeAll = onRecentClick
                    )
                }
                items(uiState.recentResources.take(5)) { resource ->
                    RecentResourceItem(resource = resource, onClick = { onResourceClick(resource) })
                }
            }

            // ── Error state ───────────────────────────────────────────────
            uiState.error?.let { err ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Filled.WifiOff, null,
                                tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp))
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

// ── Section header ───────────────────────────────────────────────────────────

@Composable
private fun SectionHeader(
    title: String,
    icon: ImageVector,
    onSeeAll: (() -> Unit)?
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 8.dp, top = 16.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null,
            modifier = Modifier.size(18.dp),
            tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f)
        )
        if (onSeeAll != null) {
            TextButton(onClick = onSeeAll) {
                Text("See all", style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

// ── Quick action pill ────────────────────────────────────────────────────────

@Composable
private fun QuickAction(
    icon: ImageVector,
    label: String,
    tintColor: Color = MaterialTheme.colorScheme.primary,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        FilledTonalIconButton(
            onClick = onClick,
            modifier = Modifier.size(52.dp),
            shape = RoundedCornerShape(16.dp),
            colors = IconButtonDefaults.filledTonalIconButtonColors(
                containerColor = tintColor.copy(alpha = 0.12f)
            )
        ) {
            Icon(icon, null, modifier = Modifier.size(22.dp), tint = tintColor)
        }
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1
        )
    }
}

// ── Continue Reading card ────────────────────────────────────────────────────

@Composable
private fun ContinueReadingCard(
    progress: ReadingProgress,
    onClick: () -> Unit
) {
    val pct = if (progress.totalPages > 0)
        (progress.currentPage + 1f) / progress.totalPages else 0f

    Card(
        onClick = onClick,
        modifier = Modifier.width(160.dp),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.MenuBook, null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text(
                progress.name,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 16.sp
            )
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { pct },
                modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Page ${progress.currentPage + 1} / ${progress.totalPages}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// ── Level card ───────────────────────────────────────────────────────────────

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
            .height(130.dp)
            .shadow(5.dp, RoundedCornerShape(18.dp))
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
                    maxLines = 2,
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
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.TopEnd) {
            Icon(
                Icons.Filled.ArrowForward, null,
                tint = Color.White.copy(alpha = 0.5f),
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

// ── Announcements ────────────────────────────────────────────────────────────

@Composable
private fun AnnouncementsSection(announcements: List<Announcement>) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        announcements.take(3).forEach { ann ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF8E1)),
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

// ── Recent resource list item ─────────────────────────────────────────────────

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
