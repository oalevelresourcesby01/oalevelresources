package com.oalevel.resources.ui.screens

import androidx.compose.animation.*
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.data.remote.SearchResult
import com.oalevel.resources.ui.components.SkeletonBox
import com.oalevel.resources.ui.viewmodel.SearchViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    onResultClick: (SearchResult) -> Unit,
    onBack: () -> Unit,
    viewModel: SearchViewModel = hiltViewModel()
) {
    val uiState       by viewModel.uiState.collectAsState()
    val focusRequester = remember { FocusRequester() }

    var selectedYear    by remember { mutableStateOf<Int?>(null) }
    var selectedSession by remember { mutableStateOf<String?>(null) }

    val currentYear = remember { java.util.Calendar.getInstance().get(java.util.Calendar.YEAR) }
    val years       = remember { (currentYear downTo 2000).toList() }
    val sessions    = remember { listOf("May/Jun", "Oct/Nov", "Feb/Mar") }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    val filteredResults = remember(uiState.results, selectedYear, selectedSession) {
        uiState.results.filter { r ->
            val yearOk = selectedYear == null || r.name.contains(selectedYear.toString())
            val sessionOk = selectedSession == null || when (selectedSession) {
                "May/Jun" -> r.name.contains("may", ignoreCase = true) ||
                             r.name.contains("jun", ignoreCase = true) ||
                             r.name.contains("s1",  ignoreCase = true) ||
                             r.name.contains("m1",  ignoreCase = true)
                "Oct/Nov" -> r.name.contains("oct", ignoreCase = true) ||
                             r.name.contains("nov", ignoreCase = true) ||
                             r.name.contains("s2",  ignoreCase = true)
                "Feb/Mar" -> r.name.contains("feb", ignoreCase = true) ||
                             r.name.contains("mar", ignoreCase = true) ||
                             r.name.contains("s3",  ignoreCase = true)
                else -> true
            }
            yearOk && sessionOk
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    TextField(
                        value        = uiState.query,
                        onValueChange = viewModel::onQueryChange,
                        placeholder  = {
                            Text(
                                "Search PDFs, subjects, years…",
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                            )
                        },
                        singleLine = true,
                        colors     = TextFieldDefaults.colors(
                            focusedContainerColor    = MaterialTheme.colorScheme.surface,
                            unfocusedContainerColor  = MaterialTheme.colorScheme.surface,
                            focusedTextColor         = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor       = MaterialTheme.colorScheme.onSurface,
                            cursorColor              = MaterialTheme.colorScheme.primary,
                            focusedIndicatorColor    = Color.Transparent,
                            unfocusedIndicatorColor  = Color.Transparent
                        ),
                        trailingIcon = {
                            if (uiState.query.isNotEmpty()) {
                                IconButton(onClick = {
                                    viewModel.clearQuery()
                                    selectedYear    = null
                                    selectedSession = null
                                }) {
                                    Icon(Icons.Filled.Clear, "Clear",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(28.dp))
                            .focusRequester(focusRequester)
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor    = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {

            // ── Filter chips ──────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("all", "pdf", "folder").forEach { type ->
                    FilterChip(
                        selected = uiState.selectedType == type,
                        onClick  = { viewModel.onTypeChange(type) },
                        label    = {
                            Text(when (type) {
                                "all"    -> "All"
                                "pdf"    -> "📄 PDFs"
                                "folder" -> "📁 Folders"
                                else     -> type
                            })
                        }
                    )
                }

                if (uiState.query.isNotEmpty()) {
                    VerticalDivider(modifier = Modifier.height(32.dp).padding(horizontal = 4.dp))

                    // Year filter
                    var showYearMenu by remember { mutableStateOf(false) }
                    Box {
                        FilterChip(
                            selected      = selectedYear != null,
                            onClick       = { showYearMenu = true },
                            label         = { Text(if (selectedYear != null) "$selectedYear" else "Year") },
                            trailingIcon  = { Icon(Icons.Filled.ArrowDropDown, null, Modifier.size(16.dp)) }
                        )
                        DropdownMenu(expanded = showYearMenu, onDismissRequest = { showYearMenu = false }) {
                            DropdownMenuItem(
                                text    = { Text("All years") },
                                onClick = { selectedYear = null; showYearMenu = false }
                            )
                            years.take(25).forEach { year ->
                                DropdownMenuItem(
                                    text    = { Text("$year") },
                                    onClick = { selectedYear = year; showYearMenu = false }
                                )
                            }
                        }
                    }

                    // Session filter
                    var showSessionMenu by remember { mutableStateOf(false) }
                    Box {
                        FilterChip(
                            selected     = selectedSession != null,
                            onClick      = { showSessionMenu = true },
                            label        = { Text(selectedSession ?: "Session") },
                            trailingIcon = { Icon(Icons.Filled.ArrowDropDown, null, Modifier.size(16.dp)) }
                        )
                        DropdownMenu(expanded = showSessionMenu, onDismissRequest = { showSessionMenu = false }) {
                            DropdownMenuItem(
                                text    = { Text("All sessions") },
                                onClick = { selectedSession = null; showSessionMenu = false }
                            )
                            sessions.forEach { session ->
                                DropdownMenuItem(
                                    text    = { Text(session) },
                                    onClick = { selectedSession = session; showSessionMenu = false }
                                )
                            }
                        }
                    }
                }
            }

            // Active filter pills
            AnimatedVisibility(visible = selectedYear != null || selectedSession != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp)
                        .padding(bottom = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment     = Alignment.CenterVertically
                ) {
                    Text("Filtering:",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    selectedYear?.let {
                        ActiveFilterPill("$it") { selectedYear = null }
                    }
                    selectedSession?.let {
                        ActiveFilterPill(it) { selectedSession = null }
                    }
                }
            }

            HorizontalDivider()

            when {
                // ── Skeleton loading ──────────────────────────────────────
                uiState.isLoading -> LazyColumn(
                    contentPadding = PaddingValues(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(8) { SkeletonResultItem() }
                }

                // ── Empty query: show recent searches or prompt ───────────
                uiState.query.isEmpty() -> {
                    if (uiState.recentSearches.isNotEmpty()) {
                        LazyColumn {
                            item {
                                ListItem(
                                    headlineContent = {
                                        Text("Recent Searches",
                                            style      = MaterialTheme.typography.labelMedium,
                                            color      = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = FontWeight.SemiBold)
                                    },
                                    trailingContent = {
                                        TextButton(onClick = viewModel::clearRecentSearches) {
                                            Text("Clear all")
                                        }
                                    }
                                )
                            }
                            items(uiState.recentSearches) { search ->
                                ListItem(
                                    headlineContent = { Text(search) },
                                    leadingContent  = {
                                        Icon(Icons.Filled.History, null,
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    },
                                    trailingContent = {
                                        Icon(Icons.Filled.NorthWest, null,
                                            tint     = MaterialTheme.colorScheme.outline,
                                            modifier = Modifier.size(16.dp))
                                    },
                                    modifier = Modifier.clickable { viewModel.onQueryChange(search) }
                                )
                                HorizontalDivider()
                            }
                        }
                    } else {
                        Box(Modifier.fillMaxSize(), Alignment.Center) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(88.dp)
                                        .clip(RoundedCornerShape(28.dp))
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Filled.Search, null,
                                        modifier = Modifier.size(44.dp),
                                        tint     = MaterialTheme.colorScheme.primary.copy(alpha = 0.55f))
                                }
                                Spacer(Modifier.height(4.dp))
                                Text("Search resources",
                                    style      = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold)
                                Text("Try: \"Biology 5090\", \"2023\", \"Physics\"",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }

                // ── No results ────────────────────────────────────────────
                filteredResults.isEmpty() && !uiState.isLoading -> Box(
                    Modifier.fillMaxSize(), Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(88.dp)
                                .clip(RoundedCornerShape(28.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.SearchOff, null,
                                modifier = Modifier.size(44.dp),
                                tint     = MaterialTheme.colorScheme.outline)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            if (uiState.results.isNotEmpty()) "No matches for current filters"
                            else "No results for \"${uiState.query}\"",
                            style      = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        if (selectedYear != null || selectedSession != null) {
                            TextButton(onClick = {
                                selectedYear    = null
                                selectedSession = null
                            }) { Text("Clear filters") }
                        }
                    }
                }

                // ── Results ───────────────────────────────────────────────
                else -> LazyColumn(contentPadding = PaddingValues(8.dp)) {
                    item {
                        Text(
                            "${filteredResults.size} result${if (filteredResults.size != 1) "s" else ""}${
                                if (selectedYear != null || selectedSession != null) " (filtered)" else ""
                            }",
                            style    = MaterialTheme.typography.labelMedium,
                            color    = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                        )
                    }
                    items(filteredResults) { result ->
                        SearchResultItem(result = result, onClick = { onResultClick(result) })
                        Spacer(Modifier.height(2.dp))
                    }
                }
            }
        }
    }
}

// ── Skeleton result item ──────────────────────────────────────────────────────

@Composable
private fun SkeletonResultItem() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SkeletonBox(modifier = Modifier.size(42.dp), shape = RoundedCornerShape(12.dp))
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            SkeletonBox(modifier = Modifier.fillMaxWidth(0.8f).height(13.dp))
            SkeletonBox(modifier = Modifier.fillMaxWidth(0.5f).height(10.dp))
        }
    }
}

// ── Active filter pill ────────────────────────────────────────────────────────

@Composable
private fun ActiveFilterPill(label: String, onRemove: () -> Unit) {
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer,
        shape = RoundedCornerShape(20.dp)
    ) {
        Row(
            modifier = Modifier.padding(start = 10.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(label,
                style      = MaterialTheme.typography.labelSmall,
                color      = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.SemiBold)
            IconButton(onClick = onRemove, modifier = Modifier.size(16.dp)) {
                Icon(Icons.Filled.Close, "Remove",
                    modifier = Modifier.size(12.dp),
                    tint     = MaterialTheme.colorScheme.onPrimaryContainer)
            }
        }
    }
}

// ── Search result item ────────────────────────────────────────────────────────

@Composable
private fun SearchResultItem(result: SearchResult, onClick: () -> Unit) {
    val isFolder = result.type == "folder"
    ElevatedCard(
        onClick   = onClick,
        modifier  = Modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(12.dp),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
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
                    result.name,
                    fontWeight = FontWeight.Medium,
                    maxLines   = 2,
                    overflow   = TextOverflow.Ellipsis,
                    style      = MaterialTheme.typography.bodyMedium
                )
                val breadcrumb = result.breadcrumb.dropLast(1).joinToString(" › ") { it.name }
                if (breadcrumb.isNotEmpty()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        breadcrumb,
                        style    = MaterialTheme.typography.labelSmall,
                        color    = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Icon(
                Icons.Filled.ChevronRight, null,
                tint     = MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}
