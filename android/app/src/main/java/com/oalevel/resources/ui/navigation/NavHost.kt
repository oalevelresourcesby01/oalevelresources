package com.oalevel.resources.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.oalevel.resources.ui.screens.*
import com.oalevel.resources.ui.theme.OALevelTheme

sealed class Screen(val route: String) {
    object Home          : Screen("home")
    object BrowseRoot   : Screen("browse_root")
    object Browse       : Screen("browse/{nodeId}") {
        fun withId(nodeId: String) = "browse/$nodeId"
    }
    object PdfViewer    : Screen("pdf/{nodeId}/{name}") {
        fun withId(nodeId: String, name: String) =
            "pdf/${java.net.URLEncoder.encode(nodeId, "UTF-8")}/${java.net.URLEncoder.encode(name, "UTF-8")}"
    }
    object Search       : Screen("search")
    object Downloads    : Screen("downloads")
    object Favourites   : Screen("favourites")
    object Recent       : Screen("recent")
    object ContinueReading : Screen("continue_reading")
    object Settings     : Screen("settings")
    object AiChat       : Screen("ai_chat")
    object Dashboard    : Screen("dashboard")
}

private data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector = icon
)

private val bottomNavItems = listOf(
    BottomNavItem(Screen.Home.route,       "Home",      Icons.Outlined.Home,      Icons.Filled.Home),
    BottomNavItem(Screen.BrowseRoot.route, "Browse",    Icons.Outlined.Folder,    Icons.Filled.Folder),
    BottomNavItem(Screen.Search.route,     "Search",    Icons.Outlined.Search,    Icons.Filled.Search),
    BottomNavItem(Screen.Downloads.route,  "Downloads", Icons.Outlined.Download,  Icons.Filled.Download),
    BottomNavItem(Screen.AiChat.route,     "AI Chat",   Icons.Outlined.SmartToy,  Icons.Filled.SmartToy),
)

private val tabRoutes = bottomNavItems.map { it.route }.toSet()

// ── Transition specs ─────────────────────────────────────────────────────────

/** Fade + gentle scale for tab switches */
private val tabEnter: AnimatedContentTransitionScope<*>.() -> EnterTransition = {
    fadeIn(tween(220, easing = FastOutSlowInEasing)) +
    scaleIn(initialScale = 0.97f, animationSpec = tween(220, easing = FastOutSlowInEasing))
}
private val tabExit: AnimatedContentTransitionScope<*>.() -> ExitTransition = {
    fadeOut(tween(150))
}

/** Slide from right for push navigation */
private val pushEnter: AnimatedContentTransitionScope<*>.() -> EnterTransition = {
    fadeIn(tween(280)) +
    slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(280, easing = FastOutSlowInEasing))
}
private val pushExit: AnimatedContentTransitionScope<*>.() -> ExitTransition = {
    fadeOut(tween(220)) +
    slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(220, easing = FastOutSlowInEasing))
}

/** Slide from left on back-pop */
private val popEnter: AnimatedContentTransitionScope<*>.() -> EnterTransition = {
    fadeIn(tween(280)) +
    slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(280, easing = FastOutSlowInEasing))
}
private val popExit: AnimatedContentTransitionScope<*>.() -> ExitTransition = {
    fadeOut(tween(220)) +
    slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(220, easing = FastOutSlowInEasing))
}

@Composable
fun OALevelNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val systemDark = isSystemInDarkTheme()
    var darkOverride by rememberSaveable { mutableStateOf<Boolean?>(null) }
    val isDark = darkOverride ?: systemDark

    OALevelTheme(darkTheme = isDark) {
        Surface(modifier = Modifier.fillMaxSize()) {
            val showBottomNav = currentRoute in tabRoutes ||
                currentRoute?.startsWith("browse/") == true ||
                currentRoute == Screen.Favourites.route ||
                currentRoute == Screen.ContinueReading.route

            Scaffold(
                bottomBar = {
                    AnimatedVisibility(
                        visible = showBottomNav,
                        enter   = slideInVertically { it } + fadeIn(tween(200)),
                        exit    = slideOutVertically { it } + fadeOut(tween(150))
                    ) {
                        NavigationBar(
                            tonalElevation = NavigationBarDefaults.Elevation
                        ) {
                            bottomNavItems.forEach { item ->
                                val selected = currentRoute == item.route ||
                                    (item.route == Screen.BrowseRoot.route && currentRoute?.startsWith("browse/") == true)
                                NavigationBarItem(
                                    selected = selected,
                                    onClick = {
                                        if (item.route == Screen.Home.route) {
                                            navController.navigate(Screen.Home.route) {
                                                popUpTo(Screen.Home.route) { inclusive = true }
                                                launchSingleTop = true
                                            }
                                        } else {
                                            navController.navigate(item.route) {
                                                popUpTo(Screen.Home.route) { saveState = true }
                                                launchSingleTop = true
                                                restoreState    = true
                                            }
                                        }
                                    },
                                    icon = {
                                        Icon(
                                            if (selected) item.selectedIcon else item.icon,
                                            contentDescription = item.label
                                        )
                                    },
                                    label   = { Text(item.label) },
                                    colors  = NavigationBarItemDefaults.colors(
                                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                                    )
                                )
                            }
                        }
                    }
                },
                contentWindowInsets = WindowInsets(0)
            ) { innerPadding ->
                NavHost(
                    navController    = navController,
                    startDestination = Screen.Home.route,
                    modifier         = Modifier.padding(innerPadding)
                ) {
                    // ── Home (tab) ─────────────────────────────────────────────
                    composable(
                        Screen.Home.route,
                        enterTransition    = tabEnter,
                        exitTransition     = tabExit,
                        popEnterTransition = tabEnter,
                        popExitTransition  = tabExit
                    ) {
                        HomeScreen(
                            onLevelClick           = { node -> navController.navigate(Screen.Browse.withId(node.id)) },
                            onSearchClick          = {
                                navController.navigate(Screen.Search.route) {
                                    popUpTo(Screen.Home.route) { saveState = true }
                                    launchSingleTop = true; restoreState = true
                                }
                            },
                            onDownloadsClick       = {
                                navController.navigate(Screen.Downloads.route) {
                                    popUpTo(Screen.Home.route) { saveState = true }
                                    launchSingleTop = true; restoreState = true
                                }
                            },
                            onFavouritesClick      = { navController.navigate(Screen.Favourites.route) },
                            onRecentClick          = { navController.navigate(Screen.Recent.route) },
                            onContinueReadingClick = { navController.navigate(Screen.ContinueReading.route) },
                            onSettingsClick        = { navController.navigate(Screen.Settings.route) },
                            onAiChatClick          = {
                                navController.navigate(Screen.AiChat.route) {
                                    popUpTo(Screen.Home.route) { saveState = true }
                                    launchSingleTop = true; restoreState = true
                                }
                            },
                            onDashboardClick       = { navController.navigate(Screen.Dashboard.route) },
                            onResourceClick        = { resource ->
                                if (resource.type == "folder")
                                    navController.navigate(Screen.Browse.withId(resource.id))
                                else
                                    navController.navigate(Screen.PdfViewer.withId(resource.id, resource.name))
                            }
                        )
                    }

                    // ── Browse root (tab) ──────────────────────────────────────
                    composable(
                        Screen.BrowseRoot.route,
                        enterTransition    = tabEnter,
                        exitTransition     = tabExit,
                        popEnterTransition = tabEnter,
                        popExitTransition  = tabExit
                    ) {
                        BrowseScreen(
                            nodeId      = "root",
                            onNodeClick = { node ->
                                if (node.type == "folder")
                                    navController.navigate(Screen.Browse.withId(node.id))
                                else
                                    navController.navigate(Screen.PdfViewer.withId(node.id, node.name))
                            },
                            onBack      = null,
                            onHomeClick = {
                                navController.navigate(Screen.Home.route) {
                                    popUpTo(Screen.Home.route) { inclusive = true }
                                    launchSingleTop = true
                                }
                            },
                            onBreadcrumbClick = { item ->
                                navController.navigate(Screen.Browse.withId(item.id)) {
                                    popUpTo(Screen.BrowseRoot.route)
                                    launchSingleTop = true
                                }
                            }
                        )
                    }

                    // ── Browse sub-folder (push) ───────────────────────────────
                    composable(
                        Screen.Browse.route,
                        arguments          = listOf(navArgument("nodeId") { type = NavType.StringType }),
                        enterTransition    = pushEnter,
                        exitTransition     = pushExit,
                        popEnterTransition = popEnter,
                        popExitTransition  = popExit
                    ) { back ->
                        val nodeId = back.arguments?.getString("nodeId") ?: return@composable
                        BrowseScreen(
                            nodeId      = nodeId,
                            onNodeClick = { node ->
                                if (node.type == "folder")
                                    navController.navigate(Screen.Browse.withId(node.id))
                                else
                                    navController.navigate(Screen.PdfViewer.withId(node.id, node.name))
                            },
                            onBack      = { navController.popBackStack() },
                            onHomeClick = {
                                navController.navigate(Screen.Home.route) {
                                    popUpTo(Screen.Home.route) { inclusive = true }
                                    launchSingleTop = true
                                }
                            },
                            onBreadcrumbClick = { item ->
                                navController.navigate(Screen.Browse.withId(item.id)) {
                                    popUpTo(Screen.BrowseRoot.route)
                                    launchSingleTop = true
                                }
                            }
                        )
                    }

                    // ── PDF Viewer (push) ──────────────────────────────────────
                    composable(
                        Screen.PdfViewer.route,
                        arguments = listOf(
                            navArgument("nodeId") { type = NavType.StringType },
                            navArgument("name")   { type = NavType.StringType }
                        ),
                        enterTransition    = pushEnter,
                        exitTransition     = pushExit,
                        popEnterTransition = popEnter,
                        popExitTransition  = popExit
                    ) { back ->
                        val nodeId = java.net.URLDecoder.decode(back.arguments?.getString("nodeId") ?: "", "UTF-8")
                        val name   = java.net.URLDecoder.decode(back.arguments?.getString("name")   ?: "", "UTF-8")
                        PdfViewerScreen(
                            nodeId      = nodeId,
                            displayName = name,
                            onBack      = { navController.popBackStack() },
                            onOpenAnother = { id, n ->
                                navController.navigate(Screen.PdfViewer.withId(id, n)) {
                                    popUpTo(Screen.PdfViewer.route) { inclusive = true }
                                }
                            }
                        )
                    }

                    // ── Search (tab) ───────────────────────────────────────────
                    composable(
                        Screen.Search.route,
                        enterTransition    = tabEnter,
                        exitTransition     = tabExit,
                        popEnterTransition = tabEnter,
                        popExitTransition  = tabExit
                    ) {
                        SearchScreen(
                            onResultClick = { result ->
                                if (result.type == "folder")
                                    navController.navigate(Screen.Browse.withId(result.id))
                                else
                                    navController.navigate(Screen.PdfViewer.withId(result.id, result.name))
                            },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    // ── Downloads (tab) ────────────────────────────────────────
                    composable(
                        Screen.Downloads.route,
                        enterTransition    = tabEnter,
                        exitTransition     = tabExit,
                        popEnterTransition = tabEnter,
                        popExitTransition  = tabExit
                    ) {
                        DownloadsScreen(
                            onOpenPdf = { download ->
                                navController.navigate(Screen.PdfViewer.withId(download.resourceId, download.name))
                            },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    // ── Favourites (push) ──────────────────────────────────────
                    composable(
                        Screen.Favourites.route,
                        enterTransition    = pushEnter,
                        exitTransition     = pushExit,
                        popEnterTransition = popEnter,
                        popExitTransition  = popExit
                    ) {
                        FavouritesScreen(
                            onItemClick = { fav ->
                                if (fav.type == "folder")
                                    navController.navigate(Screen.Browse.withId(fav.resourceId))
                                else
                                    navController.navigate(Screen.PdfViewer.withId(fav.resourceId, fav.name))
                            },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    // ── Recent (push) ──────────────────────────────────────────
                    composable(
                        Screen.Recent.route,
                        enterTransition    = pushEnter,
                        exitTransition     = pushExit,
                        popEnterTransition = popEnter,
                        popExitTransition  = popExit
                    ) {
                        RecentScreen(
                            onItemClick = { item ->
                                if (item.type == "folder")
                                    navController.navigate(Screen.Browse.withId(item.resourceId))
                                else
                                    navController.navigate(Screen.PdfViewer.withId(item.resourceId, item.name))
                            },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    // ── Continue Reading (push) ────────────────────────────────
                    composable(
                        Screen.ContinueReading.route,
                        enterTransition    = pushEnter,
                        exitTransition     = pushExit,
                        popEnterTransition = popEnter,
                        popExitTransition  = popExit
                    ) {
                        ContinueReadingScreen(
                            onPdfClick = { progress ->
                                navController.navigate(Screen.PdfViewer.withId(progress.resourceId, progress.name))
                            },
                            onBack = { navController.popBackStack() }
                        )
                    }

                    // ── Settings (push) ────────────────────────────────────────
                    composable(
                        Screen.Settings.route,
                        enterTransition    = pushEnter,
                        exitTransition     = pushExit,
                        popEnterTransition = popEnter,
                        popExitTransition  = popExit
                    ) {
                        SettingsScreen(
                            onBack       = { navController.popBackStack() },
                            isDark       = isDark,
                            onToggleDark = { darkOverride = !isDark }
                        )
                    }

                    // ── AI Chat (tab) ──────────────────────────────────────────
                    composable(
                        Screen.AiChat.route,
                        enterTransition    = tabEnter,
                        exitTransition     = tabExit,
                        popEnterTransition = tabEnter,
                        popExitTransition  = tabExit
                    ) {
                        AiChatScreen(onBack = { navController.popBackStack() })
                    }

                    // ── Dashboard (push) ───────────────────────────────────────
                    composable(
                        Screen.Dashboard.route,
                        enterTransition    = pushEnter,
                        exitTransition     = pushExit,
                        popEnterTransition = popEnter,
                        popExitTransition  = popExit
                    ) {
                        DashboardScreen(
                            onBack                 = { navController.popBackStack() },
                            onContinueReadingClick = { navController.navigate(Screen.ContinueReading.route) },
                            onDownloadsClick       = {
                                navController.navigate(Screen.Downloads.route) {
                                    popUpTo(Screen.Home.route) { saveState = true }
                                    launchSingleTop = true; restoreState = true
                                }
                            },
                            onFavouritesClick      = { navController.navigate(Screen.Favourites.route) }
                        )
                    }
                }
            }
        }
    }
}
