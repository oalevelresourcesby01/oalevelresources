package com.oalevel.resources.di

import android.content.Context
import androidx.room.Room
import com.oalevel.resources.data.local.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "oalevel_db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideResourceDao(db: AppDatabase) = db.resourceDao()
    @Provides fun provideDownloadDao(db: AppDatabase) = db.downloadDao()
    @Provides fun provideFavouriteDao(db: AppDatabase) = db.favouriteDao()
    @Provides fun provideReadingProgressDao(db: AppDatabase) = db.readingProgressDao()
    @Provides fun provideRecentViewedDao(db: AppDatabase) = db.recentViewedDao()
    @Provides fun provideBookmarkDao(db: AppDatabase) = db.bookmarkDao()
    @Provides fun provideRecentSearchDao(db: AppDatabase) = db.recentSearchDao()
    @Provides fun provideChatMessageDao(db: AppDatabase) = db.chatMessageDao()
}
