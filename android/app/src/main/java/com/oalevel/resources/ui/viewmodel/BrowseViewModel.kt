package com.oalevel.resources.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import com.oalevel.resources.data.local.Download
import com.oalevel.resources.data.remote.*
import com.oalevel.resources.data.repository.DownloadRepository
import com.oalevel.resources.data.repository.ResourceRepository
import com.oalevel.resources.data.service.DownloadService
import javax.inject.Inject

data class BrowseUiState(
    val isLoading: Boolean = false,
    val currentNode: ResourceNode? = null,
    val children: List<ResourceNode> = emptyList(),
    val breadcrumb: List<BreadcrumbItem> = emptyList(),
    val error: String? = null,
    val downloadMap: Map<String, Download> = emptyMap(),
    val isFolderDownloading: Boolean = false
)

@HiltViewModel
class BrowseViewModel @Inject constructor(
    private val repository: ResourceRepository,
    private val downloadRepository: DownloadRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(BrowseUiState())
    val uiState: StateFlow<BrowseUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            downloadRepository.getAllDownloads().collect { downloads ->
                val map = downloads.associateBy { it.resourceId }
                _uiState.update { it.copy(downloadMap = map) }
            }
        }
    }

    fun loadNode(nodeId: String) {
        if (nodeId == "root") {
            loadRootLevels()
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // Fire node + breadcrumb lookups off in parallel with the cache-first
            // children stream below; they're cheap and cache-backed themselves.
            launch {
                val node = repository.getNode(nodeId).getOrNull()
                if (node != null) _uiState.update { it.copy(currentNode = node) }
            }
            launch {
                val breadcrumb = repository.getBreadcrumb(nodeId).getOrNull().orEmpty()
                _uiState.update { it.copy(breadcrumb = breadcrumb) }
            }

            var gotAnyResult = false
            repository.getNodeChildrenFlow(nodeId).collect { result ->
                result.onSuccess { children ->
                    gotAnyResult = true
                    _uiState.update {
                        it.copy(isLoading = false, children = children.items, error = null)
                    }
                    prefetchSubfolders(children.items)
                }.onFailure { e ->
                    if (!gotAnyResult) {
                        _uiState.update { it.copy(isLoading = false, error = e.message ?: "Failed to load") }
                    }
                }
            }
        }
    }

    /**
     * Auto-caches the contents of every subfolder in the background so
     * browsing deeper feels instant next time and works offline. Runs
     * silently and never touches loading/error UI state.
     */
    private fun prefetchSubfolders(items: List<ResourceNode>) {
        val folders = items.filter { it.type == "folder" }
        if (folders.isEmpty()) return
        viewModelScope.launch {
            folders.forEach { folder ->
                launch { repository.prefetchChildren(folder.id) }
            }
        }
    }

    private fun loadRootLevels() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    error = null,
                    currentNode = ResourceNode(
                        id = "root", driveId = "", name = "Browse Resources",
                        type = "folder", depth = 0
                    ),
                    breadcrumb = emptyList()
                )
            }
            var gotAnyResult = false
            repository.getLevelsFlow().collect { result ->
                result.onSuccess { levels ->
                    gotAnyResult = true
                    _uiState.update { it.copy(isLoading = false, children = levels, error = null) }
                    prefetchSubfolders(levels)
                }.onFailure { e ->
                    if (!gotAnyResult) {
                        _uiState.update { it.copy(isLoading = false, error = e.message ?: "Failed to load levels") }
                    }
                }
            }
        }
    }

    /** Download a single PDF node. */
    fun downloadSingle(node: com.oalevel.resources.data.remote.ResourceNode) {
        if (node.type != "pdf") return
        val existing = _uiState.value.downloadMap[node.id]
        if (existing?.status == "completed" || existing?.status == "downloading") return
        viewModelScope.launch {
            val urlResult = repository.getPdfUrl(node.id)
            urlResult.getOrNull()?.let { urlResponse ->
                DownloadService.start(
                    context    = context,
                    resourceId = node.id,
                    driveId    = node.driveId,
                    url        = urlResponse.url,
                    name       = node.name
                )
            }
        }
    }

    /** Download all PDFs in the current folder (top level only). */
    fun downloadFolder() {
        val pdfs = _uiState.value.children.filter { it.type == "pdf" }
        if (pdfs.isEmpty()) return

        _uiState.update { it.copy(isFolderDownloading = true) }
        viewModelScope.launch {
            pdfs.map { pdf ->
                async {
                    val existing = _uiState.value.downloadMap[pdf.id]
                    if (existing?.status == "completed") return@async
                    val urlResult = repository.getPdfUrl(pdf.id)
                    urlResult.getOrNull()?.let { urlResponse ->
                        DownloadService.start(
                            context    = context,
                            resourceId = pdf.id,
                            driveId    = pdf.driveId,
                            url        = urlResponse.url,
                            name       = pdf.name
                        )
                    }
                }
            }.awaitAll()
            _uiState.update { it.copy(isFolderDownloading = false) }
        }
    }
}
