package com.oalevel.resources.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import com.oalevel.resources.data.remote.SearchResult
import com.oalevel.resources.data.remote.ResourceNode
import com.oalevel.resources.data.repository.*
import com.oalevel.resources.data.service.DownloadService
import javax.inject.Inject

data class PdfViewerUiState(
    val isLoading: Boolean = true,
    val pdfUrl: String? = null,
    val driveId: String? = null,
    val error: String? = null,
    val currentPage: Int = 0,
    val totalPages: Int = 0,
    val nightMode: Boolean = false,
    val rotation: Int = 0,
    val isFavourite: Boolean = false,
    val isDownloaded: Boolean = false,
    // ── Split view ────────────────────────────────────────────────────────────
    val isSplitView: Boolean = false,
    val showSplitSearch: Boolean = false,
    val splitSearchQuery: String = "",
    val splitSearchResults: List<SearchResult> = emptyList(),
    val isSplitSearching: Boolean = false,
    val secondIsLoading: Boolean = false,
    val secondPdfUrl: String? = null,
    val secondName: String = "",
    val secondCurrentPage: Int = 0,
    val secondTotalPages: Int = 0,
    // ── Split-view picker: Search vs Browse ─────────────────────────────────────
    val splitPickerBrowseMode: Boolean = false,
    val splitBrowseStack: List<Pair<String, String>> = listOf("root" to "Browse Resources"),
    val splitBrowseChildren: List<ResourceNode> = emptyList(),
    val isSplitBrowsing: Boolean = false
)

@HiltViewModel
class PdfViewerViewModel @Inject constructor(
    private val resourceRepository: ResourceRepository,
    private val favouriteRepository: FavouriteRepository,
    private val readingProgressRepository: ReadingProgressRepository,
    private val downloadRepository: DownloadRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(PdfViewerUiState())
    val uiState: StateFlow<PdfViewerUiState> = _uiState.asStateFlow()

    private var currentNodeId: String = ""
    private var currentName: String = ""

    // Debounce split-search input
    private val _splitSearchQuery = MutableStateFlow("")

    init {
        @OptIn(FlowPreview::class)
        viewModelScope.launch {
            _splitSearchQuery
                .debounce(400)
                .filter { it.length >= 2 }
                .distinctUntilChanged()
                .collect { query -> performSplitSearch(query) }
        }
    }

    fun loadPdf(nodeId: String, name: String) {
        currentNodeId = nodeId
        currentName = name
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val urlResult = resourceRepository.getPdfUrl(nodeId).getOrThrow()
                val isFav = favouriteRepository.isFavourite(nodeId)
                val progress = readingProgressRepository.getProgress(nodeId)

                val existing = downloadRepository.getByResourceId(nodeId)
                _uiState.update {
                    it.copy(
                        isLoading   = false,
                        pdfUrl      = urlResult.url,
                        driveId     = urlResult.driveId,
                        isFavourite = isFav,
                        currentPage = progress?.currentPage ?: 0,
                        isDownloaded = existing?.status == "completed"
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun onPageChange(page: Int) {
        _uiState.update { it.copy(currentPage = page) }
        viewModelScope.launch {
            readingProgressRepository.saveProgress(
                resourceId = currentNodeId,
                driveId = _uiState.value.driveId ?: "",
                name = currentName,
                currentPage = page,
                totalPages = _uiState.value.totalPages
            )
        }
    }

    fun onPdfLoaded(totalPages: Int) {
        _uiState.update { it.copy(totalPages = totalPages) }
    }

    fun onSecondPageChange(page: Int) {
        _uiState.update { it.copy(secondCurrentPage = page) }
    }

    fun onSecondPdfLoaded(total: Int) {
        _uiState.update { it.copy(secondTotalPages = total) }
    }

    fun toggleNightMode() {
        _uiState.update { it.copy(nightMode = !it.nightMode) }
    }

    fun rotate() {
        _uiState.update { it.copy(rotation = (it.rotation + 90) % 360) }
    }

    fun toggleFavourite() {
        viewModelScope.launch {
            val node = resourceRepository.getNode(currentNodeId).getOrNull() ?: return@launch
            val isNowFav = favouriteRepository.toggleFavourite(node)
            _uiState.update { it.copy(isFavourite = isNowFav) }
        }
    }

    fun download() {
        val url    = _uiState.value.pdfUrl    ?: return
        val driveId = _uiState.value.driveId  ?: return
        if (_uiState.value.isDownloaded) return
        DownloadService.start(
            context    = context,
            resourceId = currentNodeId,
            driveId    = driveId,
            url        = url,
            name       = currentName
        )
        _uiState.update { it.copy(isDownloaded = true) }
    }

    // ── Split view ─────────────────────────────────────────────────────────────

    fun openSplitSearch() {
        _uiState.update {
            it.copy(
                showSplitSearch = true,
                splitSearchQuery = "",
                splitSearchResults = emptyList(),
                splitPickerBrowseMode = false,
                splitBrowseStack = listOf("root" to "Browse Resources"),
                splitBrowseChildren = emptyList()
            )
        }
    }

    fun setSplitPickerMode(browseMode: Boolean) {
        _uiState.update { it.copy(splitPickerBrowseMode = browseMode) }
        if (browseMode && _uiState.value.splitBrowseChildren.isEmpty()) {
            loadSplitBrowseChildren("root")
        }
    }

    fun loadSplitBrowseChildren(nodeId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSplitBrowsing = true) }
            val result = resourceRepository.getNodeChildren(nodeId)
            result.onSuccess { resp ->
                _uiState.update { it.copy(splitBrowseChildren = resp.items, isSplitBrowsing = false) }
            }.onFailure {
                _uiState.update { it.copy(isSplitBrowsing = false) }
            }
        }
    }

    fun onSplitBrowseFolderClick(nodeId: String, name: String) {
        _uiState.update { it.copy(splitBrowseStack = it.splitBrowseStack + (nodeId to name)) }
        loadSplitBrowseChildren(nodeId)
    }

    fun onSplitBrowseBack() {
        val stack = _uiState.value.splitBrowseStack
        if (stack.size <= 1) return
        val newStack = stack.dropLast(1)
        _uiState.update { it.copy(splitBrowseStack = newStack) }
        loadSplitBrowseChildren(newStack.last().first)
    }

    fun closeSplitSearch() {
        _uiState.update { it.copy(showSplitSearch = false) }
    }

    fun closeSplitView() {
        _uiState.update {
            it.copy(
                isSplitView = false,
                secondPdfUrl = null,
                secondName = "",
                secondCurrentPage = 0,
                secondTotalPages = 0
            )
        }
    }

    fun onSplitSearchChange(query: String) {
        _uiState.update { it.copy(splitSearchQuery = query) }
        _splitSearchQuery.value = query
    }

    private fun performSplitSearch(query: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSplitSearching = true) }
            val result = resourceRepository.search(query, "pdf", 1)
            result.onSuccess { page ->
                _uiState.update {
                    it.copy(
                        splitSearchResults = page.results.take(20),
                        isSplitSearching = false
                    )
                }
            }.onFailure {
                _uiState.update { it.copy(isSplitSearching = false) }
            }
        }
    }

    fun loadSecondPdf(nodeId: String, name: String) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    showSplitSearch = false,
                    isSplitView = true,
                    secondIsLoading = true,
                    secondName = name
                )
            }
            val result = resourceRepository.getPdfUrl(nodeId)
            result.onSuccess { urlResponse ->
                _uiState.update {
                    it.copy(secondIsLoading = false, secondPdfUrl = urlResponse.url)
                }
            }.onFailure { e ->
                _uiState.update { it.copy(secondIsLoading = false) }
            }
        }
    }
}
