package com.oalevel.resources.data.local

import android.content.Context
import androidx.room.*

// ── Entities ──────────────────────────────────────────────────────────────

@Entity(tableName = "cached_resources")
data class CachedResource(
    @PrimaryKey val id: String,
    val driveId: String,
    val name: String,
    val type: String,
    val parentId: String?,
    val depth: Int,
    val size: Long?,
    val modifiedAt: String?,
    val childCount: Int?,
    val cachedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "downloads")
data class Download(
    @PrimaryKey val id: String,
    val resourceId: String,
    val driveId: String,
    val name: String,
    val filePath: String,
    val status: String, // pending, downloading, paused, completed, error
    val progress: Int = 0,
    val totalBytes: Long = 0,
    val downloadedBytes: Long = 0,
    val errorMessage: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val completedAt: Long? = null
)

@Entity(tableName = "favourites")
data class Favourite(
    @PrimaryKey val id: String,
    val resourceId: String,
    val driveId: String,
    val name: String,
    val type: String,
    val parentPath: String = "",
    val addedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "reading_progress")
data class ReadingProgress(
    @PrimaryKey val resourceId: String,
    val driveId: String,
    val name: String,
    val currentPage: Int,
    val totalPages: Int,
    val lastReadAt: Long = System.currentTimeMillis(),
    val filePath: String? = null
)

@Entity(tableName = "recent_viewed")
data class RecentViewed(
    @PrimaryKey val resourceId: String,
    val driveId: String,
    val name: String,
    val type: String,
    val parentPath: String = "",
    val viewedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "bookmarks")
data class Bookmark(
    @PrimaryKey val id: String,
    val resourceId: String,
    val page: Int,
    val label: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "recent_searches")
data class RecentSearch(
    @PrimaryKey val query: String,
    val searchedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "ai_chat_messages")
data class ChatMessageEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val role: String, // "user" | "assistant"
    val content: String,
    val attachmentName: String? = null,
    val attachmentType: String? = null, // "image" | "file"
    val imagePreviewUri: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

// ── DAOs ──────────────────────────────────────────────────────────────────

@Dao
interface ResourceDao {
    @Query("SELECT * FROM cached_resources WHERE parentId IS NULL OR parentId = '' ORDER BY name")
    suspend fun getRootResources(): List<CachedResource>

    @Query("SELECT * FROM cached_resources WHERE parentId = :parentId ORDER BY type DESC, name")
    suspend fun getChildren(parentId: String): List<CachedResource>

    @Query("SELECT * FROM cached_resources WHERE id = :id")
    suspend fun getById(id: String): CachedResource?

    @Query("SELECT * FROM cached_resources WHERE name LIKE '%' || :query || '%' ORDER BY type DESC, name LIMIT 50")
    suspend fun search(query: String): List<CachedResource>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(resources: List<CachedResource>)

    @Query("DELETE FROM cached_resources")
    suspend fun clearAll()

    @Query("SELECT * FROM cached_resources WHERE cachedAt > :since")
    suspend fun getRecentlyCached(since: Long): List<CachedResource>
}

@Dao
interface DownloadDao {
    @Query("SELECT * FROM downloads ORDER BY createdAt DESC")
    fun getAllDownloads(): kotlinx.coroutines.flow.Flow<List<Download>>

    @Query("SELECT * FROM downloads WHERE id = :id")
    suspend fun getById(id: String): Download?

    @Query("SELECT * FROM downloads WHERE resourceId = :resourceId")
    suspend fun getByResourceId(resourceId: String): Download?

    @Query("SELECT * FROM downloads WHERE status = :status")
    suspend fun getByStatus(status: String): List<Download>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(download: Download)

    @Update
    suspend fun update(download: Download)

    @Query("DELETE FROM downloads WHERE id = :id")
    suspend fun delete(id: String)

    @Query("UPDATE downloads SET status = :status, progress = :progress, downloadedBytes = :downloaded WHERE id = :id")
    suspend fun updateProgress(id: String, status: String, progress: Int, downloaded: Long)
}

@Dao
interface FavouriteDao {
    @Query("SELECT * FROM favourites ORDER BY addedAt DESC")
    fun getAllFavourites(): kotlinx.coroutines.flow.Flow<List<Favourite>>

    @Query("SELECT * FROM favourites WHERE resourceId = :resourceId")
    suspend fun getByResourceId(resourceId: String): Favourite?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(favourite: Favourite)

    @Query("DELETE FROM favourites WHERE resourceId = :resourceId")
    suspend fun delete(resourceId: String)

    @Query("SELECT COUNT(*) FROM favourites WHERE resourceId = :resourceId")
    suspend fun isFavourite(resourceId: String): Int
}

@Dao
interface ReadingProgressDao {
    @Query("SELECT * FROM reading_progress ORDER BY lastReadAt DESC")
    fun getAllProgress(): kotlinx.coroutines.flow.Flow<List<ReadingProgress>>

    @Query("SELECT * FROM reading_progress WHERE resourceId = :resourceId")
    suspend fun getProgress(resourceId: String): ReadingProgress?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveProgress(progress: ReadingProgress)

    @Query("SELECT * FROM reading_progress ORDER BY lastReadAt DESC LIMIT :limit")
    suspend fun getRecent(limit: Int = 10): List<ReadingProgress>
}

@Dao
interface RecentViewedDao {
    @Query("SELECT * FROM recent_viewed ORDER BY viewedAt DESC LIMIT 50")
    fun getRecent(): kotlinx.coroutines.flow.Flow<List<RecentViewed>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: RecentViewed)

    @Query("DELETE FROM recent_viewed WHERE resourceId = :resourceId")
    suspend fun delete(resourceId: String)

    @Query("DELETE FROM recent_viewed WHERE viewedAt < :before")
    suspend fun cleanOld(before: Long)
}

@Dao
interface BookmarkDao {
    @Query("SELECT * FROM bookmarks WHERE resourceId = :resourceId ORDER BY page")
    fun getBookmarks(resourceId: String): kotlinx.coroutines.flow.Flow<List<Bookmark>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(bookmark: Bookmark)

    @Query("DELETE FROM bookmarks WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface RecentSearchDao {
    @Query("SELECT * FROM recent_searches ORDER BY searchedAt DESC LIMIT 10")
    fun getRecentSearches(): kotlinx.coroutines.flow.Flow<List<RecentSearch>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(search: RecentSearch)

    @Query("DELETE FROM recent_searches WHERE query = :query")
    suspend fun delete(query: String)

    @Query("DELETE FROM recent_searches")
    suspend fun clearAll()
}

@Dao
interface ChatMessageDao {
    @Query("SELECT * FROM ai_chat_messages WHERE sessionId = :sessionId ORDER BY createdAt ASC")
    suspend fun getMessages(sessionId: String): List<ChatMessageEntity>

    @Query("SELECT DISTINCT sessionId FROM ai_chat_messages ORDER BY createdAt DESC LIMIT 1")
    suspend fun getLastSessionId(): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: ChatMessageEntity)

    @Query("DELETE FROM ai_chat_messages WHERE sessionId = :sessionId")
    suspend fun clearSession(sessionId: String)
}

// ── Database ──────────────────────────────────────────────────────────────

@Database(
    entities = [
        CachedResource::class,
        Download::class,
        Favourite::class,
        ReadingProgress::class,
        RecentViewed::class,
        Bookmark::class,
        RecentSearch::class,
        ChatMessageEntity::class,
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun resourceDao(): ResourceDao
    abstract fun downloadDao(): DownloadDao
    abstract fun favouriteDao(): FavouriteDao
    abstract fun readingProgressDao(): ReadingProgressDao
    abstract fun recentViewedDao(): RecentViewedDao
    abstract fun bookmarkDao(): BookmarkDao
    abstract fun recentSearchDao(): RecentSearchDao
    abstract fun chatMessageDao(): ChatMessageDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "oalevel_db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
