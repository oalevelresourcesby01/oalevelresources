package com.oalevel.resources.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import com.oalevel.resources.data.local.RecentSearch
import com.oalevel.resources.data.local.RecentSearchDao
import com.oalevel.resources.data.remote.SearchResult
import com.oalevel.resources.data.repository.ResourceRepository
import javax.inject.Inject

data class SearchUiState(
    val query: String = "",
    val selectedType: String = "all",
    val isLoading: Boolean = false,
    val results: List<SearchResult> = emptyList(),
    val totalResults: Int = 0,
    val recentSearches: List<String> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repository: ResourceRepository,
    private val recentSearchDao: RecentSearchDao
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            recentSearchDao.getRecentSearches().collect { searches ->
                _uiState.update { it.copy(recentSearches = searches.map { s -> s.query }) }
            }
        }
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
        searchJob?.cancel()
        if (query.length < 2) {
            _uiState.update { it.copy(results = emptyList(), totalResults = 0, isLoading = false) }
            return
        }
        searchJob = viewModelScope.launch {
            delay(300) // debounce
            _uiState.update { it.copy(isLoading = true) }
            val result = repository.search(query, _uiState.value.selectedType)
            result.onSuccess { page ->
                _uiState.update { it.copy(results = page.results, totalResults = page.total, isLoading = false) }
                // Save to recent
                if (query.length > 2) {
                    recentSearchDao.insert(RecentSearch(query = query))
                }
            }.onFailure { e ->
                _uiState.update { it.copy(error = e.message, isLoading = false) }
            }
        }
    }

    fun onTypeChange(type: String) {
        _uiState.update { it.copy(selectedType = type) }
        if (_uiState.value.query.length >= 2) onQueryChange(_uiState.value.query)
    }

    fun clearQuery() {
        _uiState.update { it.copy(query = "", results = emptyList(), totalResults = 0) }
        searchJob?.cancel()
    }

    fun clearRecentSearches() {
        viewModelScope.launch { recentSearchDao.clearAll() }
    }
}
