package com.oalevel.resources.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import com.oalevel.resources.data.local.*
import com.oalevel.resources.data.repository.DownloadRepository
import com.oalevel.resources.data.repository.FavouriteRepository
import com.oalevel.resources.data.repository.ReadingProgressRepository
import com.oalevel.resources.data.repository.ResourceRepository
import javax.inject.Inject

@HiltViewModel
class DownloadsViewModel @Inject constructor(
    private val downloadRepository: DownloadRepository
) : ViewModel() {
    val downloads: Flow<List<Download>> = downloadRepository.getAllDownloads()

    fun deleteDownload(id: String) {
        viewModelScope.launch { downloadRepository.delete(id) }
    }

    fun retryDownload(id: String) {
        viewModelScope.launch { downloadRepository.retryDownload(id) }
    }
}

@HiltViewModel
class FavouritesViewModel @Inject constructor(
    private val favouriteDao: FavouriteDao
) : ViewModel() {
    val favourites: Flow<List<Favourite>> = favouriteDao.getAllFavourites()

    fun remove(resourceId: String) {
        viewModelScope.launch { favouriteDao.delete(resourceId) }
    }
}

@HiltViewModel
class RecentViewModel @Inject constructor(
    private val repository: ResourceRepository
) : ViewModel() {
    val recentItems: Flow<List<RecentViewed>> = repository.getRecentViewed()
}

@HiltViewModel
class ContinueReadingViewModel @Inject constructor(
    private val readingProgressRepository: ReadingProgressRepository
) : ViewModel() {
    val progressItems: Flow<List<ReadingProgress>> = readingProgressRepository.getAllProgress()
}
