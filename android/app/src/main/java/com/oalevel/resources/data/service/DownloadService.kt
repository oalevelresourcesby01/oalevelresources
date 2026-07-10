package com.oalevel.resources.data.service

import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.oalevel.resources.OALevelApp
import com.oalevel.resources.R
import com.oalevel.resources.data.local.Download
import com.oalevel.resources.data.repository.DownloadRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.UUID
import javax.inject.Inject

@AndroidEntryPoint
class DownloadService : Service() {

    @Inject lateinit var downloadRepository: DownloadRepository

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val notificationManager by lazy {
        getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val resourceId = intent?.getStringExtra(EXTRA_RESOURCE_ID) ?: return START_NOT_STICKY
        val driveId    = intent.getStringExtra(EXTRA_DRIVE_ID)    ?: return START_NOT_STICKY
        val url        = intent.getStringExtra(EXTRA_URL)         ?: return START_NOT_STICKY
        val name       = intent.getStringExtra(EXTRA_NAME)        ?: "file.pdf"

        startForeground(startId, buildNotification(name, 0))
        scope.launch { download(resourceId, driveId, url, name, startId) }
        return START_NOT_STICKY
    }

    private suspend fun download(
        resourceId: String,
        driveId: String,
        url: String,
        name: String,
        notifId: Int
    ) {
        val downloadId = UUID.randomUUID().toString()
        val dir = File(filesDir, "pdfs").also { it.mkdirs() }
        val file = File(dir, "${driveId}.pdf")

        val dl = Download(
            id = downloadId,
            resourceId = resourceId,
            driveId = driveId,
            name = name,
            filePath = file.absolutePath,
            status = "downloading"
        )
        downloadRepository.insert(dl)

        try {
            val connection = URL(url).openConnection()
            val total = connection.contentLength.toLong()
            var downloaded = 0L
            var lastProgress = 0

            connection.getInputStream().use { input ->
                FileOutputStream(file).use { output ->
                    val buffer = ByteArray(8 * 1024)
                    var count: Int
                    while (input.read(buffer).also { count = it } != -1) {
                        output.write(buffer, 0, count)
                        downloaded += count
                        val progress = if (total > 0) ((downloaded * 100) / total).toInt() else 0
                        if (progress != lastProgress) {
                            lastProgress = progress
                            downloadRepository.updateProgress(downloadId, "downloading", progress, downloaded)
                            notificationManager.notify(notifId, buildNotification(name, progress))
                        }
                    }
                }
            }

            downloadRepository.updateProgress(downloadId, "completed", 100, downloaded)
            notificationManager.notify(notifId, buildCompletedNotification(name))

        } catch (e: Exception) {
            file.delete()
            downloadRepository.updateProgress(downloadId, "error", 0, 0)
        } finally {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun buildNotification(name: String, progress: Int) =
        NotificationCompat.Builder(this, OALevelApp.CHANNEL_DOWNLOADS)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("Downloading")
            .setContentText(name)
            .setProgress(100, progress, progress == 0)
            .setOngoing(true)
            .setSilent(true)
            .build()

    private fun buildCompletedNotification(name: String) =
        NotificationCompat.Builder(this, OALevelApp.CHANNEL_DOWNLOADS)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("Download Complete")
            .setContentText(name)
            .setAutoCancel(true)
            .build()

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    companion object {
        const val EXTRA_RESOURCE_ID = "resourceId"
        const val EXTRA_DRIVE_ID    = "driveId"
        const val EXTRA_URL         = "url"
        const val EXTRA_NAME        = "name"

        fun start(context: Context, resourceId: String, driveId: String, url: String, name: String) {
            val intent = Intent(context, DownloadService::class.java).apply {
                putExtra(EXTRA_RESOURCE_ID, resourceId)
                putExtra(EXTRA_DRIVE_ID, driveId)
                putExtra(EXTRA_URL, url)
                putExtra(EXTRA_NAME, name)
            }
            context.startForegroundService(intent)
        }
    }
}
