package com.oalevel.resources.ui.screens

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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.ui.viewmodel.ContinueReadingViewModel
import com.oalevel.resources.ui.viewmodel.DownloadsViewModel
import com.oalevel.resources.ui.viewmodel.FavouritesViewModel
import com.oalevel.resources.ui.viewmodel.RecentViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onBack: () -> Unit,
    onContinueReadingClick: () -> Unit = {},
    onDownloadsClick: () -> Unit = {},
    onFavouritesClick: () -> Unit = {},
    continueViewModel: ContinueReadingViewModel = hiltViewModel(),
    downloadsViewModel: DownloadsViewModel = hiltViewModel(),
    favouritesViewModel: FavouritesViewModel = hiltViewModel(),
    recentViewModel: RecentViewModel = hiltViewModel()
) {
    val progressItems by continueViewModel.progressItems.collectAsState(emptyList())
    val downloads by downloadsViewModel.downloads.collectAsState(emptyList())
    val favourites by favouritesViewModel.favourites.collectAsState(emptyList())
    val recentItems by recentViewModel.recentItems.collectAsState(emptyList())

    val completedDownloads = downloads.count { it.status == "completed" }
    val totalProgress = if (progressItems.isNotEmpty())
        progressItems.sumOf { if (it.totalPages > 0) (it.currentPage + 1.0) / it.totalPages else 0.0 } / progressItems.size
    else 0.0

    val hour = remember { java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY) }
    val greeting = when {
        hour in 5..11 -> "Good morning"
        hour in 12..16 -> "Good afternoon"
        else -> "Good evening"
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("My Dashboard",
                            fontWeight = FontWeight.Bold,
                            color = Color.White)
                        Text("Your study overview",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.8f))
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            // ── Greeting header ───────────────────────────────────────────
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.background),
                                startY = 0f, endY = 200f
                            )
                        )
                        .padding(horizontal = 20.dp, vertical = 16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .shadow(4.dp, CircleShape)
                                .clip(CircleShape)
                                .background(Color.White),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Person, null,
                                modifier = Modifier.size(30.dp),
                                tint = MaterialTheme.colorScheme.primary)
                        }
                        Column {
                            Text("$greeting! 👋",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White)
                            Text("Keep up the great work",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.85f))
                        }
                    }
                }
            }

            // ── Stats row ─────────────────────────────────────────────────
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    StatCard(
                        modifier  = Modifier.weight(1f),
                        value     = "$completedDownloads",
                        label     = "Downloads",
                        icon      = Icons.Filled.Download,
                        iconColor = Color(0xFF1565C0),
                        bgColor   = MaterialTheme.colorScheme.secondaryContainer,
                        onClick   = onDownloadsClick
                    )
                    StatCard(
                        modifier  = Modifier.weight(1f),
                        value     = "${favourites.size}",
                        label     = "Favourites",
                        icon      = Icons.Filled.Favorite,
                        iconColor = MaterialTheme.colorScheme.error,
                        bgColor   = MaterialTheme.colorScheme.errorContainer,
                        onClick   = onFavouritesClick
                    )
                    StatCard(
                        modifier  = Modifier.weight(1f),
                        value     = "${progressItems.size}",
                        label     = "In Progress",
                        icon      = Icons.Filled.MenuBook,
                        iconColor = MaterialTheme.colorScheme.primary,
                        bgColor   = MaterialTheme.colorScheme.primaryContainer,
                        onClick   = onContinueReadingClick
                    )
                }
            }

            // ── Overall reading progress ───────────────────────────────────
            if (progressItems.isNotEmpty()) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Filled.TrendingUp, null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp))
                                Text("Overall Reading Progress",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.weight(1f))
                                Text("${(totalProgress * 100).toInt()}%",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary)
                            }
                            Spacer(Modifier.height(10.dp))
                            LinearProgressIndicator(
                                progress = { totalProgress.toFloat() },
                                modifier = Modifier.fillMaxWidth().height(8.dp)
                                    .clip(RoundedCornerShape(4.dp)),
                                color = MaterialTheme.colorScheme.primary,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "${progressItems.size} PDF${if (progressItems.size != 1) "s" else ""} in progress",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // ── Continue Reading section ───────────────────────────────────
            if (progressItems.isNotEmpty()) {
                item {
                    DashSectionHeader("Continue Reading", Icons.Filled.MenuBook, onContinueReadingClick)
                }
                items(progressItems.take(5)) { prog ->
                    val pct = if (prog.totalPages > 0)
                        ((prog.currentPage + 1).toFloat() / prog.totalPages * 100).toInt() else 0

                    ListItem(
                        headlineContent = {
                            Text(prog.name, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                fontWeight = FontWeight.Medium)
                        },
                        supportingContent = {
                            Column {
                                Text(
                                    "Page ${prog.currentPage + 1} of ${prog.totalPages} · $pct%",
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
                                    color = MaterialTheme.colorScheme.primary,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            }
                        },
                        leadingContent = {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color(0xFFFFEBEE), RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Filled.PictureAsPdf, null,
                                    tint = Color(0xFFC62828), modifier = Modifier.size(22.dp))
                            }
                        },
                        trailingContent = {
                            Text("$pct%",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (pct >= 80) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.onSurfaceVariant)
                        },
                        modifier = Modifier.clickable { onContinueReadingClick() }
                    )
                    HorizontalDivider()
                }
            }

            // ── Recent activity ───────────────────────────────────────────
            if (recentItems.isNotEmpty()) {
                item {
                    DashSectionHeader("Recent Activity", Icons.Filled.History, null)
                }
                items(recentItems.take(5)) { item ->
                    val isFolder = item.type == "folder"
                    ListItem(
                        headlineContent = { Text(item.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        leadingContent = {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .background(
                                        if (isFolder) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                                        RoundedCornerShape(10.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    if (isFolder) Icons.Filled.Folder else Icons.Filled.PictureAsPdf,
                                    null,
                                    tint = if (isFolder) Color(0xFF2E7D32) else Color(0xFFC62828),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    )
                    HorizontalDivider()
                }
            }

            // ── Empty state ───────────────────────────────────────────────
            if (progressItems.isEmpty() && favourites.isEmpty() && downloads.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(40.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.School, null,
                                modifier = Modifier.size(72.dp),
                                tint = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                            Spacer(Modifier.height(16.dp))
                            Text("Start exploring resources",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold)
                            Text("Your study progress will appear here",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(
    modifier: Modifier,
    value: String,
    label: String,
    icon: ImageVector,
    iconColor: Color,
    bgColor: Color,
    onClick: () -> Unit
) {
    ElevatedCard(
        onClick   = onClick,
        modifier  = modifier,
        shape     = RoundedCornerShape(16.dp),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(bgColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = iconColor, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text(
                value,
                style      = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color      = iconColor
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun DashSectionHeader(
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
            modifier = Modifier.size(16.dp),
            tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(6.dp))
        Text(
            title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f)
        )
        if (onSeeAll != null) {
            TextButton(onClick = onSeeAll) {
                Text("See all", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
