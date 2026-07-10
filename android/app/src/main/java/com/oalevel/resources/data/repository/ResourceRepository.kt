package com.oalevel.resources.data.repository

import com.oalevel.resources.data.local.*
import com.oalevel.resources.data.remote.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ResourceRepository @Inject constructor(
    private val api: ApiService,
    private val resourceDao: ResourceDao,
    private val recentViewedDao: RecentViewedDao
) {
    private fun ResourceNode.toCached(parent: String?): CachedResource = CachedResource(
        id = id,
        driveId = driveId,
        name = name,
        type = type,
        parentId = parent,
        depth = depth,
        size = size,
        modifiedAt = modifiedAt,
        childCount = childCount
    )

    private fun CachedResource.toNode(): ResourceNode = ResourceNode(
        id = id,
        driveId = driveId,
        name = name,
        type = type,
        depth = depth,
        parentId = parentId,
        size = size,
        modifiedAt = modifiedAt,
        childCount = childCount
    )

    /**
     * Cache-first top-level levels. Emits cached data immediately (if any) for
     * instant/offline display, then emits fresh network data once it arrives
     * and updates the cache for next time.
     */
    fun getLevelsFlow(): Flow<Result<List<ResourceNode>>> = flow {
        val cached = runCatching { resourceDao.getRootResources().map { it.toNode() } }.getOrDefault(emptyList())
        if (cached.isNotEmpty()) emit(Result.success(cached))

        val network = runCatching { api.getLevels() }
        network.onSuccess { levels ->
            runCatching { resourceDao.insertAll(levels.map { it.toCached(null) }) }
            emit(Result.success(levels))
        }.onFailure { e ->
            if (cached.isEmpty()) emit(Result.failure(e))
        }
    }

    /**
     * Cache-first children of a node. Same emit-cache-then-network pattern as
     * [getLevelsFlow], enabling instant folder navigation + offline browsing.
     */
    fun getNodeChildrenFlow(nodeId: String): Flow<Result<NodeChildrenResponse>> = flow {
        val cached = runCatching { resourceDao.getChildren(nodeId).map { it.toNode() } }.getOrDefault(emptyList())
        if (cached.isNotEmpty()) {
            emit(Result.success(NodeChildrenResponse(cached, cached.size, 1, cached.size)))
        }

        val network = runCatching { api.getNodeChildren(nodeId) }
        network.onSuccess { resp ->
            runCatching { resourceDao.insertAll(resp.items.map { it.toCached(nodeId) }) }
            emit(Result.success(resp))
        }.onFailure { e ->
            if (cached.isEmpty()) emit(Result.failure(e))
        }
    }

    /** Get top-level education levels (single-shot, network-first) */
    suspend fun getLevels(): Result<List<ResourceNode>> = runCatching { api.getLevels() }

    /** Get children of a node (single-shot, network-first) */
    suspend fun getNodeChildren(nodeId: String): Result<NodeChildrenResponse> =
        runCatching { api.getNodeChildren(nodeId) }

    /**
     * Silently warms the cache for a folder's children without affecting any
     * UI state. Used to auto-cache subfolders in the background as the user
     * browses, so re-opening them later (or going offline) is instant.
     */
    suspend fun prefetchChildren(nodeId: String) {
        runCatching { api.getNodeChildren(nodeId) }
            .onSuccess { resp -> runCatching { resourceDao.insertAll(resp.items.map { it.toCached(nodeId) }) } }
    }

    /** Get a specific node, falling back to the local cache when offline */
    suspend fun getNode(nodeId: String): Result<ResourceNode> {
        if (nodeId == "root") {
            return Result.success(ResourceNode(id = "root", driveId = "", name = "Browse Resources", type = "folder", depth = 0))
        }
        val network = runCatching { api.getNode(nodeId) }
        if (network.isSuccess) return network
        val cached = runCatching { resourceDao.getById(nodeId) }.getOrNull()
        return if (cached != null) Result.success(cached.toNode()) else network
    }

    /** Get breadcrumb path (empty list when offline, rather than failing the whole screen) */
    suspend fun getBreadcrumb(nodeId: String): Result<List<BreadcrumbItem>> {
        val network = runCatching { api.getNodeBreadcrumb(nodeId) }
        return if (network.isSuccess) network else Result.success(emptyList())
    }

    /** Get PDF streaming URL */
    suspend fun getPdfUrl(nodeId: String): Result<PdfUrlResponse> =
        runCatching { api.getPdfUrl(nodeId) }

    /** Get resource statistics */
    suspend fun getStats(): Result<ResourceStats> = runCatching { api.getResourceStats() }

    /** Get recently added resources */
    suspend fun getRecentResources(limit: Int = 20): Result<List<ResourceItem>> =
        runCatching { api.getRecentResources(limit) }

    /** Search resources */
    suspend fun search(query: String, type: String = "all", page: Int = 1): Result<SearchPage> =
        runCatching { api.search(query, type, page) }

    /** Get public config */
    suspend fun getPublicConfig(): Result<PublicConfig> =
        runCatching { api.getPublicConfig() }

    /** Get active announcements */
    suspend fun getAnnouncements(): Result<List<Announcement>> =
        runCatching { api.getAnnouncements(active = true) }

    /** Get sync status */
    suspend fun getSyncStatus(): Result<SyncStatus> =
        runCatching { api.getSyncStatus() }

    /** Track recently viewed */
    suspend fun trackView(resource: ResourceNode, parentPath: String = "") {
        recentViewedDao.insert(
            RecentViewed(
                resourceId = resource.id,
                driveId = resource.driveId,
                name = resource.name,
                type = resource.type,
                parentPath = parentPath,
                viewedAt = System.currentTimeMillis()
            )
        )
    }

    fun getRecentViewed(): Flow<List<RecentViewed>> = recentViewedDao.getRecent()
}

@Singleton
class DownloadRepository @Inject constructor(
    private val downloadDao: DownloadDao
) {
    fun getAllDownloads(): Flow<List<Download>> = downloadDao.getAllDownloads()
    suspend fun getByResourceId(resourceId: String): Download? = downloadDao.getByResourceId(resourceId)
    suspend fun insert(download: Download) = downloadDao.insert(download)
    suspend fun update(download: Download) = downloadDao.update(download)
    suspend fun updateProgress(id: String, status: String, progress: Int, downloaded: Long) =
        downloadDao.updateProgress(id, status, progress, downloaded)
    suspend fun delete(id: String) = downloadDao.delete(id)
    suspend fun retryDownload(id: String) =
        downloadDao.updateProgress(id, "pending", 0, 0)
}

@Singleton
class FavouriteRepository @Inject constructor(
    private val favouriteDao: FavouriteDao
) {
    fun getAllFavourites(): Flow<List<Favourite>> = favouriteDao.getAllFavourites()

    suspend fun isFavourite(resourceId: String): Boolean =
        favouriteDao.isFavourite(resourceId) > 0

    suspend fun toggleFavourite(resource: ResourceNode, parentPath: String = ""): Boolean {
        val existing = favouriteDao.getByResourceId(resource.id)
        return if (existing != null) {
            favouriteDao.delete(resource.id)
            false
        } else {
            favouriteDao.insert(
                Favourite(
                    id = java.util.UUID.randomUUID().toString(),
                    resourceId = resource.id,
                    driveId = resource.driveId,
                    name = resource.name,
                    type = resource.type,
                    parentPath = parentPath
                )
            )
            true
        }
    }
}

@Singleton
class ReadingProgressRepository @Inject constructor(
    private val readingProgressDao: ReadingProgressDao
) {
    fun getAllProgress(): Flow<List<ReadingProgress>> = readingProgressDao.getAllProgress()

    suspend fun getProgress(resourceId: String): ReadingProgress? =
        readingProgressDao.getProgress(resourceId)

    suspend fun saveProgress(
        resourceId: String,
        driveId: String,
        name: String,
        currentPage: Int,
        totalPages: Int,
        filePath: String? = null
    ) {
        readingProgressDao.saveProgress(
            ReadingProgress(
                resourceId = resourceId,
                driveId = driveId,
                name = name,
                currentPage = currentPage,
                totalPages = totalPages,
                filePath = filePath,
                lastReadAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun getRecentlyRead(limit: Int = 10): List<ReadingProgress> =
        readingProgressDao.getRecent(limit)
}

@Singleton
class AiRepository @Inject constructor(
    private val api: ApiService
) {
    suspend fun sendMessage(
        message: String,
        sessionId: String,
        model: String? = null,
        imageBase64: String? = null,
        pdfText: String? = null
    ): Result<AiReply> = runCatching {
        api.aiChat(AiChatRequest(message, sessionId, model, imageBase64, pdfText))
    }

    suspend fun getMessages(sessionId: String): Result<List<AiMessage>> =
        runCatching { api.getAiMessages(sessionId) }

    suspend fun clearSession(sessionId: String): Result<Unit> =
        runCatching { api.clearAiSession(sessionId); Unit }
}

/**
 * Persists AI chat history locally so it survives app restarts. History is
 * only ever wiped when the user explicitly clears the session — never
 * automatically.
 */
@Singleton
class ChatHistoryRepository @Inject constructor(
    private val chatMessageDao: ChatMessageDao
) {
    suspend fun getLastSessionId(): String? = chatMessageDao.getLastSessionId()

    suspend fun getMessages(sessionId: String): List<ChatMessageEntity> =
        chatMessageDao.getMessages(sessionId)

    suspend fun saveMessage(message: ChatMessageEntity) = chatMessageDao.insert(message)

    suspend fun clearSession(sessionId: String) = chatMessageDao.clearSession(sessionId)
}
