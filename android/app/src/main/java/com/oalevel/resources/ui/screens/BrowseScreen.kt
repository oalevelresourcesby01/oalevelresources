package com.oalevel.resources.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.data.local.Download
import com.oalevel.resources.data.remote.BreadcrumbItem
import com.oalevel.resources.data.remote.ResourceNode
import com.oalevel.resources.ui.viewmodel.BrowseViewModel

private fun formatSize(bytes: Long): String {
    return when {
        bytes >= 1_048_576 -> "%.1f MB".format(bytes / 1_048_576.0)
        bytes >= 1_024 -> "%.0f KB".format(bytes / 1_024.0)
        else -> "$bytes B"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BrowseScreen(
    nodeId: String,
    onNodeClick: (ResourceNode) -> Unit,
    onBack: (() -> Unit)? = null,
    onHomeClick: (() -> Unit)? = null,
    onBreadcrumbClick: ((BreadcrumbItem) -> Unit)? = null,
    viewModel: BrowseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val hasPdfs = uiState.children.any { it.type == "pdf" }

    LaunchedEffect(nodeId) { viewModel.loadNode(nodeId) }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Text(
                            uiState.currentNode?.name ?: "Browse",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    navigationIcon = {
                        if (onBack != null) {
                            IconButton(onClick = onBack) {
                                Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                            }
                        }
                    },
                    actions = {
                        if (hasPdfs) {
                            if (uiState.isFolderDownloading) {
                                Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(22.dp),
                                        strokeWidth = 2.dp,
                                        color = Color.White
                                    )
                                }
                            } else {
                                IconButton(onClick = viewModel::downloadFolder) {
                                    Icon(
                                        Icons.Filled.DownloadForOffline,
                                        contentDescription = "Download all PDFs",
                                        tint = Color.White
                                    )
                                }
                            }
                        }
                        IconButton(onClick = { viewModel.loadNode(nodeId) }) {
                            Icon(Icons.Filled.Refresh, "Refresh", tint = Color.White)
                        }
                        if (onHomeClick != null && uiState.breadcrumb.size > 1) {
                            IconButton(onClick = onHomeClick) {
                                Icon(Icons.Filled.Home, "Home", tint = Color.White)
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                )
                if (uiState.breadcrumb.isNotEmpty()) {
                    BreadcrumbRow(
                        breadcrumb = uiState.breadcrumb,
                        onItemClick = onBreadcrumbClick
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                }
            }
        }
    ) { padding ->
        when {
            uiState.isLoading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator()
            }
            uiState.error != null -> Box(
                Modifier.fillMaxSize().padding(padding).padding(16.dp), Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(MaterialTheme.colorScheme.errorContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.WifiOff, null, Modifier.size(36.dp),
                            tint = MaterialTheme.colorScheme.error)
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Couldn't load this folder",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        uiState.error!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                    Spacer(Modifier.height(20.dp))
                    Button(onClick = { viewModel.loadNode(nodeId) }) { Text("Try Again") }
                }
            }
            uiState.children.isEmpty() -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.FolderOpen, null, Modifier.size(40.dp),
                            tint = MaterialTheme.colorScheme.outline)
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Empty folder",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "No resources here yet",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
            else -> LazyColumn(
                Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Summary chip row
                item {
                    val folderCount = uiState.children.count { it.type == "folder" }
                    val pdfCount = uiState.children.count { it.type == "pdf" }
                    Row(
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (folderCount > 0) CountChip(
                            label = "$folderCount folder${if (folderCount != 1) "s" else ""}",
                            containerColor = MaterialTheme.colorScheme.secondaryContainer,
                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                        if (pdfCount > 0) CountChip(
                            label = "$pdfCount PDF${if (pdfCount != 1) "s" else ""}",
                            containerColor = Color(0xFFFFEBEE),
                            contentColor = Color(0xFFC62828)
                        )
                    }
                }
                items(uiState.children) { node ->
                    val download = if (node.type == "pdf") uiState.downloadMap[node.id] else null
                    val canDownload = node.type == "pdf" &&
                        download?.status != "completed" &&
                        download?.status != "downloading"
                    ResourceNodeItem(
                        node       = node,
                        download   = download,
                        onClick    = { onNodeClick(node) },
                        onDownload = if (canDownload) ({ viewModel.downloadSingle(node) }) else null
                    )
                }
            }
        }
    }
}

@Composable
private fun CountChip(label: String, containerColor: Color, contentColor: Color) {
    Surface(
        color = containerColor,
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = contentColor,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun BreadcrumbRow(
    breadcrumb: List<BreadcrumbItem>,
    onItemClick: ((BreadcrumbItem) -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Filled.Home, null,
            modifier = Modifier.size(14.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        breadcrumb.forEachIndexed { index, item ->
            Icon(Icons.Filled.ChevronRight, null,
                Modifier.size(14.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant)
            val isLast = index == breadcrumb.lastIndex
            Text(
                text = item.name,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (isLast) FontWeight.SemiBold else FontWeight.Normal,
                color = if (isLast)
                    MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                // Non-last crumbs are tappable for direct jump
                modifier = if (!isLast && onItemClick != null)
                    Modifier.clickable { onItemClick(item) }
                else Modifier
            )
        }
    }
}

@Composable
fun ResourceNodeItem(
    node: ResourceNode,
    download: Download? = null,
    onClick: () -> Unit,
    onDownload: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val isFolder = node.type == "folder"
    val downloadStatus = download?.status

    val iconBg = when {
        isFolder -> Brush.linearGradient(listOf(Color(0xFF43A047), Color(0xFF1B5E20)))
        else     -> Brush.linearGradient(listOf(Color(0xFFE53935), Color(0xFFC62828)))
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Icon container with gradient
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .shadow(2.dp, RoundedCornerShape(12.dp))
                    .clip(RoundedCornerShape(12.dp))
                    .background(iconBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isFolder) Icons.Filled.Folder else Icons.Filled.PictureAsPdf,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )
                // Download complete checkmark badge
                if (downloadStatus == "completed") {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.BottomEnd
                    ) {
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(Color.White),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Filled.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF43A047),
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }

            // Text content
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    node.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 3.dp)
                ) {
                    if (isFolder) {
                        Text(
                            "${node.childCount ?: 0} items",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        node.size?.let {
                            Text(
                                formatSize(it),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        when (downloadStatus) {
                            "completed"   -> StatusBadge("✓ Downloaded", Color(0xFF2E7D32), Color(0xFFE8F5E9))
                            "downloading" -> StatusBadge("↓ ${download?.progress ?: 0}%", Color(0xFF1565C0), Color(0xFFE3F2FD))
                            "pending"     -> StatusBadge("Queued", Color(0xFF757575), Color(0xFFF5F5F5))
                            "error"       -> StatusBadge("Error", Color(0xFFC62828), Color(0xFFFFEBEE))
                        }
                    }
                }
            }

            // Trailing action
            if (isFolder) {
                Icon(
                    Icons.Filled.ChevronRight, null,
                    tint = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.size(20.dp)
                )
            } else if (onDownload != null) {
                FilledTonalIconButton(
                    onClick = onDownload,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(Icons.Filled.Download, "Download",
                        modifier = Modifier.size(18.dp))
                }
            }
        }

        // Progress bar for active download
        if (downloadStatus == "downloading") {
            LinearProgressIndicator(
                progress = { (download?.progress ?: 0) / 100f },
                modifier = Modifier.fillMaxWidth().height(3.dp),
                color = Color(0xFF1565C0),
                trackColor = Color(0xFFBBDEFB)
            )
        }
    }
}

@Composable
private fun StatusBadge(text: String, color: Color, bgColor: Color) {
    Surface(color = bgColor, shape = RoundedCornerShape(6.dp)) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@Composable
private fun DownloadBadge(text: String, color: Color) {
    Surface(
        color = color.copy(alpha = 0.12f),
        shape = RoundedCornerShape(4.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
        )
    }
}
