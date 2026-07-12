package com.oalevel.resources.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Brand green palette
val Green10  = Color(0xFF003909)
val Green20  = Color(0xFF00531A)
val Green30  = Color(0xFF006E2A)
val Green40  = Color(0xFF1B8A3D)  // primary
val Green80  = Color(0xFF7EDC87)
val Green90  = Color(0xFF9FF59E)

val GreenDark10  = Color(0xFF002106)
val GreenDark20  = Color(0xFF00390F)
val GreenDark30  = Color(0xFF00531A)
val GreenDark40  = Color(0xFF006E2A)  // dark primary

val LightColorScheme = lightColorScheme(
    primary            = Color(0xFF1B5E20),
    onPrimary          = Color.White,
    primaryContainer   = Color(0xFFA5D6A7),
    onPrimaryContainer = Color(0xFF003909),
    secondary          = Color(0xFF2E7D32),
    onSecondary        = Color.White,
    secondaryContainer = Color(0xFFC8E6C9),
    onSecondaryContainer = Color(0xFF003909),
    tertiary           = Color(0xFF558B2F),
    onTertiary         = Color.White,
    background         = Color(0xFFFAFAF5),
    onBackground       = Color(0xFF1A1C18),
    surface            = Color(0xFFFAFAF5),
    onSurface          = Color(0xFF1A1C18),
    surfaceVariant     = Color(0xFFDDE5DA),
    onSurfaceVariant   = Color(0xFF414941),
    outline            = Color(0xFF717971),
    error              = Color(0xFFBA1A1A),
    onError            = Color.White,
)

val DarkColorScheme = darkColorScheme(
    primary            = Color(0xFF81C784),
    onPrimary          = Color(0xFF003909),
    primaryContainer   = Color(0xFF1B5E20),
    onPrimaryContainer = Color(0xFFA5D6A7),
    secondary          = Color(0xFFA5D6A7),
    onSecondary        = Color(0xFF003909),
    secondaryContainer = Color(0xFF2E7D32),
    onSecondaryContainer = Color(0xFFC8E6C9),
    tertiary           = Color(0xFFA5D6A7),
    onTertiary         = Color(0xFF003909),
    background         = Color(0xFF1A1C18),
    onBackground       = Color(0xFFE2E3DC),
    surface            = Color(0xFF1A1C18),
    onSurface          = Color(0xFFE2E3DC),
    surfaceVariant     = Color(0xFF414941),
    onSurfaceVariant   = Color(0xFFC1C9BE),
    outline            = Color(0xFF8B9389),
    error              = Color(0xFFFFB4AB),
    onError            = Color(0xFF690005),
)

@Composable
fun OALevelTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalView.current.context
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
