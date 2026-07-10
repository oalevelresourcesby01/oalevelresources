package com.oalevel.resources.data.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.*

// ── Data models ───────────────────────────────────────────────────────────

@Serializable
data class ResourceNode(
    val id: String,
    val driveId: String,
    val name: String,
    val type: String, // "folder" | "pdf"
    val depth: Int,
    val parentId: String? = null,
    val mimeType: String? = null,
    val size: Long? = null,
    val modifiedAt: String? = null,
    val childCount: Int? = null,
    val createdAt: String = ""
)

@Serializable
data class NodeChildrenResponse(
    val items: List<ResourceNode>,
    val total: Int,
    val page: Int,
    val pageSize: Int
)

@Serializable
data class BreadcrumbItem(
    val id: String,
    val name: String
)

@Serializable
data class PdfUrlResponse(
    val url: String,
    val expiresAt: String,
    val driveId: String
)

@Serializable
data class ResourceStats(
    val totalPdfs: Int,
    val totalFolders: Int,
    val totalLevels: Int,
    val totalSubjects: Int,
    val lastSync: String? = null,
    val totalSizeBytes: Long? = null
)

@Serializable
data class ResourceItem(
    val id: String,
    val driveId: String,
    val name: String,
    val type: String,
    val parentId: String? = null,
    val parentName: String? = null,
    val size: Long? = null,
    val modifiedAt: String? = null
)

@Serializable
data class Announcement(
    val id: String,
    val title: String,
    val message: String,
    val active: Boolean,
    val priority: Int,
    val createdAt: String,
    val updatedAt: String? = null
)

@Serializable
data class PublicConfig(
    val appName: String = "O/A Level Resources",
    val whatsappChannel: String = "",
    val aboutUs: String = "",
    val contactEmail: String = "",
    val contactPhone: String = "",
    val maintenanceMode: Boolean = false,
    val aiEnabled: Boolean = true,
    val aiSystemPrompt: String = "",
    val aiModel: String = "",
    val theme: String = "light"
)

@Serializable
data class SyncStatus(
    val status: String,
    val lastSync: String? = null,
    val progress: Double? = null,
    val message: String? = null,
    val totalFiles: Int? = null,
    val totalFolders: Int? = null
)

@Serializable
data class SearchResult(
    val id: String,
    val driveId: String,
    val name: String,
    val type: String,
    val breadcrumb: List<BreadcrumbItem> = emptyList(),
    val size: Long? = null,
    val modifiedAt: String? = null
)

@Serializable
data class SearchPage(
    val results: List<SearchResult>,
    val total: Int,
    val query: String,
    val page: Int,
    val pageSize: Int
)

@Serializable
data class AiMessage(
    val id: String,
    val sessionId: String,
    val role: String,
    val content: String,
    val createdAt: String
)

@Serializable
data class AiChatRequest(
    val message: String,
    val sessionId: String,
    val model: String? = null,
    val imageBase64: String? = null,
    val pdfText: String? = null
)

@Serializable
data class AiReply(
    val reply: String,
    val sessionId: String,
    val model: String,
    val tokens: Int? = null
)

@Serializable
data class HealthStatus(
    val status: String,
    val uptime: Double,
    val version: String,
    val syncStatus: String? = null
)

// ── Retrofit API interface ─────────────────────────────────────────────────

interface ApiService {

    @GET("healthz")
    suspend fun healthCheck(): HealthStatus

    // Resources
    @GET("resources/levels")
    suspend fun getLevels(): List<ResourceNode>

    @GET("resources/stats")
    suspend fun getResourceStats(): ResourceStats

    @GET("resources/recent")
    suspend fun getRecentResources(
        @Query("limit") limit: Int = 20
    ): List<ResourceItem>

    @GET("resources/nodes/{nodeId}")
    suspend fun getNode(@Path("nodeId") nodeId: String): ResourceNode

    @GET("resources/nodes/{nodeId}/children")
    suspend fun getNodeChildren(@Path("nodeId") nodeId: String): NodeChildrenResponse

    @GET("resources/nodes/{nodeId}/breadcrumb")
    suspend fun getNodeBreadcrumb(@Path("nodeId") nodeId: String): List<BreadcrumbItem>

    @GET("resources/pdf/{nodeId}/url")
    suspend fun getPdfUrl(@Path("nodeId") nodeId: String): PdfUrlResponse

    // Search
    @GET("search")
    suspend fun search(
        @Query("q") query: String,
        @Query("type") type: String = "all",
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 30
    ): SearchPage

    // Announcements
    @GET("announcements")
    suspend fun getAnnouncements(
        @Query("active") active: Boolean? = null
    ): List<Announcement>

    // Config
    @GET("config")
    suspend fun getPublicConfig(): PublicConfig

    // Sync status
    @GET("drive/sync/status")
    suspend fun getSyncStatus(): SyncStatus

    // AI
    @POST("ai/chat")
    suspend fun aiChat(@Body request: AiChatRequest): AiReply

    @GET("ai/sessions/{sessionId}/messages")
    suspend fun getAiMessages(@Path("sessionId") sessionId: String): List<AiMessage>

    @DELETE("ai/sessions/{sessionId}/messages")
    suspend fun clearAiSession(@Path("sessionId") sessionId: String): Response<Unit>
}
