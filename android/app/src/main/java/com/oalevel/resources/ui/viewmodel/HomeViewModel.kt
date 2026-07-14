package com.oalevel.resources.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import com.oalevel.resources.data.remote.*
import com.oalevel.resources.data.repository.ResourceRepository
import javax.inject.Inject

data class HomeUiState(
    val isLoadingLevels: Boolean = true,
    val levels: List<ResourceNode> = emptyList(),
    val announcements: List<Announcement> = emptyList(),
    val recentResources: List<ResourceItem> = emptyList(),
    val config: PublicConfig? = null,
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: ResourceRepository
) : ViewModel() {

    companion object {
        // Always-visible fallback cards — replaced with real nodes (incl. IDs) on first load.
        private val FALLBACK_LEVELS = listOf(
            ResourceNode(id = "", driveId = "", name = "O Level", type = "folder", depth = 0),
            ResourceNode(id = "", driveId = "", name = "A Level", type = "folder", depth = 0),
        )
    }

    private val _uiState = MutableStateFlow(
        HomeUiState(isLoadingLevels = false, levels = FALLBACK_LEVELS)
    )
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingLevels = true, error = null)

            // Levels are cache-first (instant if cached, then refreshed from network).
            launch {
                var gotAnyResult = false
                repository.getLevelsFlow().collect { result ->
                    result.onSuccess { levels ->
                        gotAnyResult = true
                        _uiState.value = _uiState.value.copy(
                            isLoadingLevels = false, levels = levels, error = null
                        )
                    }.onFailure { e ->
                        if (!gotAnyResult) {
                            _uiState.value = _uiState.value.copy(
                                isLoadingLevels = false, error = e.message
                            )
                        }
                    }
                }
            }

            // Rest load in parallel; not cached (need network, fail silently offline).
            val announcementsResult = async { repository.getAnnouncements() }
            val recentResult = async { repository.getRecentResources(10) }
            val configResult = async { repository.getPublicConfig() }

            _uiState.value = _uiState.value.copy(
                announcements = announcementsResult.await().getOrDefault(emptyList()),
                recentResources = recentResult.await().getOrDefault(emptyList()),
                config = configResult.await().getOrNull()
            )
        }
    }

    fun refresh() = loadData()
}
