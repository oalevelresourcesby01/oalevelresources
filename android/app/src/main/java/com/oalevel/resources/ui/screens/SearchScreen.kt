package com.oalevel.resources.ui.screens

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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.oalevel.resources.data.remote.SearchResult
import com.oalevel.resources.ui.viewmodel.SearchViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    onResultClick: (SearchResult) -> Unit,
    onBack: () -> Unit,
    viewModel: SearchViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    // True white rounded search field on green bar
                    TextField(
                        value = uiState.query,
                        onValueChange = viewModel::onQueryChange,
                        placeholder = {
                            Text("Search PDFs, folders, subjects…",
                                color = Color(0xFF757575))
                        },
                        singleLine = true,
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor   = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedTextColor        = Color(0xFF212121),
                            unfocusedTextColor      = Color(0xFF212121),
                            cursorColor             = MaterialTheme.colorScheme.primary,
                            focusedIndicatorColor   = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        ),
                        trailingIcon = {
                            if (uiState.query.isNotEmpty()) {
                                IconButton(onClick = viewModel::clearQuery) {
                                    Icon(Icons.Filled.Clear, "Clear",
                                        tint = Color(0xFF757575))
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(24.dp))
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
            // Filter chips
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("all", "pdf", "folder").forEach { type ->
                    FilterChip(
                        selected = uiState.selectedType == type,
                        onClick  = { viewModel.onTypeChange(type) },
                        label    = { Text(type.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }
            HorizontalDivider()

            when {
                uiState.isLoading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    CircularProgressIndicator()
                }
                uiState.query.isEmpty() -> {
                    if (uiState.recentSearches.isNotEmpty()) {
                        LazyColumn {
                            item {
                                ListItem(
                                    headlineContent = {
                                        Text("Recent Searches",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    },
                                    trailingContent = {
                                        TextButton(onClick = viewModel::clearRecentSearches) {
                                            Text("Clear")
                                        }
                                    }
                                )
                            }
                            items(uiState.recentSearches) { search ->
                                ListItem(
                                    headlineContent = { Text(search) },
                                    leadingContent = {
                                        Icon(Icons.Filled.History, null,
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    },
                                    modifier = Modifier.clickable {
                                        viewModel.onQueryChange(search)
                                    }
                                )
                            }
                        }
                    } else {
                        Box(Modifier.fillMaxSize(), Alignment.Center) {
                            Text("Type to search…",
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                uiState.results.isEmpty() && !uiState.isLoading -> {
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.SearchOff, null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.outline)
                            Spacer(Modifier.height(8.dp))
                            Text("No results for \"${uiState.query}\"",
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                else -> {
                    LazyColumn(contentPadding = PaddingValues(8.dp)) {
                        item {
                            Text(
                                "${uiState.totalResults} results",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                        items(uiState.results) { result ->
                            SearchResultItem(result = result, onClick = { onResultClick(result) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchResultItem(result: SearchResult, onClick: () -> Unit) {
    val isFolder = result.type == "folder"
    ListItem(
        headlineContent = { Text(result.name) },
        supportingContent = {
            Text(
                result.breadcrumb.dropLast(1).joinToString(" > ") { it.name },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
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
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { onClick() }
    )
}
