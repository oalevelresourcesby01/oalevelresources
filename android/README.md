# O/A Level Resources — Android App

## Setup

### Requirements
- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34
- Kotlin 1.9.x

### Configuration

The backend URL is configured in `app/build.gradle.kts`:
```kotlin
buildConfigField("String", "BASE_URL", "\"https://oalevelresources.onrender.com/api/\"")
```

For local development, change this to your local IP:
```kotlin
buildConfigField("String", "BASE_URL", "\"http://192.168.1.x:5000/api/\"")
```

### Build

1. Open the `android/` folder in Android Studio
2. Wait for Gradle sync to complete
3. Run on a device or emulator (minSdk 26 = Android 8.0+)

### Architecture

```
app/
├── data/
│   ├── local/        Room database (offline cache, downloads, favourites, progress)
│   ├── remote/       Retrofit API service + Network module
│   ├── repository/   Repository pattern implementations
│   └── service/      DownloadService (foreground service)
├── di/               Hilt dependency injection modules
└── ui/
    ├── navigation/   NavHost with all routes
    ├── screens/      All composable screens
    ├── theme/        Material 3 theme (green palette)
    └── viewmodel/    ViewModels for all screens
```

### Security

- **No API keys in the APK** — all sensitive keys (Google Drive, OpenRouter) stay on the backend
- The app only communicates with `oalevelresources.onrender.com`
- Network security config blocks all cleartext traffic
- ProGuard enabled for release builds

### Features

| Screen | Description |
|--------|-------------|
| Home | Level cards, announcements, WhatsApp channel, recent resources |
| Browse | Navigate Level → Subject → Category → Folder → PDF with breadcrumb |
| PDF Viewer | Native PDF rendering, night mode, zoom, progress tracking |
| Search | Real-time recursive search with filters |
| Downloads | Background PDF download with progress |
| Favourites | Bookmarked PDFs and folders |
| Recent | Recently viewed items |
| Continue Reading | Reading progress tracking |
| AI Chat | Conversational AI powered by OpenRouter (via backend) |
| Settings | App configuration |

### Key Dependencies

- **Jetpack Compose** — Modern UI
- **Hilt** — Dependency injection
- **Retrofit + OkHttp** — Networking
- **Room** — Local SQLite database
- **WorkManager** — Background tasks
- **PDF Viewer (barteksc)** — Native PDF rendering
- **Material Design 3** — UI components
