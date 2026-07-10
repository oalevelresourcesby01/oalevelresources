package com.oalevel.resources.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.oalevel.resources.ui.screens.*

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object BrowseRoot : Screen("browse_root")
    object Browse : Screen("browse/{nodeId}") {
        fun withId(nodeId: String) = "browse/$nodeId"
    }
    object PdfViewer : Screen("pdf/{nodeId}/{name}") {
        fun withId(nodeId: String, name: String) =
            "pdf/${java.net.URLEncoder.encode(nodeId, "UTF-8")}/${java.net.URLEncoder.encode(name, "UTF-8")}"
    }
    object Search : Screen("search")
    object Downloads : Screen("downloads")
    object Favourites : Screen("favourites")
    object Recent : Screen("recent")
    object ContinueReading : Screen("continue_reading")
    object Settings : Screen("settings")
    object AiChat : Screen("ai_chat")
}

private data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

private val bottomNavItems = listOf(
    BottomNavItem(Screen.Home.route,      "Home",      Icons.Filled.Home),
    BottomNavItem(Screen.BrowseRoot.route,"Browse",    Icons.Filled.Folder),
    BottomNavItem(Screen.Search.route,    "Search",    Icons.Filled.Search),
    BottomNavItem(Screen.Downloads.route, "Downloads", Icons.Filled.Download),
    BottomNavItem(Screen.AiChat.route,    "AI Chat",   Icons.Filled.SmartToy),
)

private val tabRoutes = bottomNavItems.map { it.route }.toSet()

@Composable
fun OALevelNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val showBottomNav = currentRoute in tabRoutes ||
        currentRoute?.startsWith("browse/") == true ||
        currentRoute == Screen.Favourites.route ||
        currentRoute == Screen.ContinueReading.route

    Scaffold(
        bottomBar = {
            AnimatedVisibility(
                visible = showBottomNav,
                enter = slideInVertically { it },
                exit  = slideOutVertically { it }
            ) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        val selected = currentRoute == item.route ||
                            (item.route == Screen.BrowseRoot.route && currentRoute?.startsWith("browse/") == true)
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(Screen.Home.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon    = { Icon(item.icon, contentDescription = item.label) },
                            label   = { Text(item.label) }
                        )
                    }
                }
            }
        },
        contentWindowInsets = WindowInsets(0)
    ) { innerPadding ->
        NavHost(
            navController     = navController,
            startDestination  = Screen.Home.route,
            modifier          = Modifier.padding(innerPadding)
        ) {
            // ── Tab: Home ──────────────────────────────────────────────────
            composable(Screen.Home.route) {
                HomeScreen(
                    onLevelClick          = { node -> navController.navigate(Screen.Browse.withId(node.id)) },
                    onSearchClick         = {
                        navController.navigate(Screen.Search.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true; restoreState = true
                        }
                    },
                    onDownloadsClick      = {
                        navController.navigate(Screen.Downloads.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true; restoreState = true
                        }
                    },
                    onFavouritesClick     = { navController.navigate(Screen.Favourites.route) },
                    onRecentClick         = { navController.navigate(Screen.Recent.route) },
                    onContinueReadingClick= { navController.navigate(Screen.ContinueReading.route) },
                    onSettingsClick       = { navController.navigate(Screen.Settings.route) },
                    onAiChatClick         = {
                        navController.navigate(Screen.AiChat.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true; restoreState = true
                        }
                    },
                    onResourceClick       = { resource ->
                        if (resource.type == "folder")
                            navController.navigate(Screen.Browse.withId(resource.id))
                        else
                            navController.navigate(Screen.PdfViewer.withId(resource.id, resource.name))
                    }
                )
            }

            // ── Tab: Browse root (shows all levels) ───────────────────────
            composable(Screen.BrowseRoot.route) {
                BrowseScreen(
                    nodeId      = "root",
                    onNodeClick = { node ->
                        if (node.type == "folder")
                            navController.navigate(Screen.Browse.withId(node.id))
                        else
                            navController.navigate(Screen.PdfViewer.withId(node.id, node.name))
                    },
                    onBack = null,
                    onHomeClick = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Home.route) { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                )
            }

            // ── Browse: sub-folder ─────────────────────────────────────────
            composable(
                Screen.Browse.route,
                arguments = listOf(navArgument("nodeId") { type = NavType.StringType })
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
                    onBack = { navController.popBackStack() },
                    onHomeClick = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Home.route) { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                )
            }

            // ── PDF Viewer ─────────────────────────────────────────────────
            composable(
                Screen.PdfViewer.route,
                arguments = listOf(
                    navArgument("nodeId") { type = NavType.StringType },
                    navArgument("name")   { type = NavType.StringType }
                )
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

            // ── Tab: Search ────────────────────────────────────────────────
            composable(Screen.Search.route) {
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

            // ── Tab: Downloads ─────────────────────────────────────────────
            composable(Screen.Downloads.route) {
                DownloadsScreen(
                    onOpenPdf = { download ->
                        navController.navigate(Screen.PdfViewer.withId(download.resourceId, download.name))
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Push screens ───────────────────────────────────────────────
            composable(Screen.Favourites.route) {
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

            composable(Screen.Recent.route) {
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

            composable(Screen.ContinueReading.route) {
                ContinueReadingScreen(
                    onPdfClick = { progress ->
                        navController.navigate(Screen.PdfViewer.withId(progress.resourceId, progress.name))
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(onBack = { navController.popBackStack() })
            }

            // ── Tab: AI Chat ───────────────────────────────────────────────
            composable(Screen.AiChat.route) {
                AiChatScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
