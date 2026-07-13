---
name: Android UI Redesign
description: Premium Material 3 Android UI redesign — what was changed, key patterns used, and environment constraints.
---

# Android UI Redesign

## What was delivered
Full Material 3 premium redesign across all Android screens, committed to GitHub (auto-deploys to Render).

## New shared component package
`ui/components/UiComponents.kt` — `SkeletonBox` (shimmer via `rememberInfiniteTransition`) and `PremiumEmptyState` (icon in rounded container + title + subtitle + optional CTA). Import from `com.oalevel.resources.ui.components`.

## Key changes per screen
- **NavHost**: Page transitions — `fadeIn + scaleIn` for tab switches, `fadeIn + slideIntoContainer` for push/pop navigation. Uses `AnimatedContentTransitionScope<*>.() ->` lambdas defined as private top-level vals.
- **BrowseScreen**: Shimmer skeleton list replaces `CircularProgressIndicator`; `ElevatedCard` nodes with gradient icon backgrounds; `StatusBadge` chips.
- **SearchScreen**: Shimmer skeleton; `ElevatedCard` results; active filter pills with remove button; `PremiumEmptyState` for empty states.
- **StubScreens**: Settings redesigned with card-grouped sections + colour-tinted icon tiles. Downloads use `ElevatedCard` with status-colour accents. All empty states use `PremiumEmptyState`. `EmptyState()` kept for backwards compatibility as a thin wrapper.
- **HomeScreen**: Static skeleton `Box` → animated `SkeletonBox`.
- **DashboardScreen**: `StatCard` colours now use `MaterialTheme.colorScheme.*Container` (dark-mode safe). `ElevatedCard` instead of `Card`.
- **AiChatScreen**: Input field uses `focusedContainerColor`/`unfocusedContainerColor` for subtle tint.
- **PdfViewerScreen**: `PdfLoadingState` uses shimmer A4-ratio skeleton rectangles. `PdfErrorState` uses icon container + descriptive text + rounded Button.

## Environment constraint
The Replit environment has no Android SDK, so `./gradlew assembleDebug` cannot run. Java (GraalVM 22.3) was installed successfully via the module system. To build, the project must be cloned locally or built via a CI runner with Android SDK.

**Why:** Android SDK is not available via Nix modules in Replit. The code was verified by:
- Checking ViewModel method signatures against usage
- Checking data model fields (`Download`, `Favourite`, `ReadingProgress`, `RecentViewed`) against usages
- Confirming navigation-compose 2.7.7 supports `slideIntoContainer`/`slideOutOfContainer`
- Confirming Compose animation wildcard import covers all transition types used

## Rules obeyed
- No changes to ViewModels, Room entities, networking, repositories, or AI logic
- All business logic, state management, and ViewModel calls preserved verbatim
- No new Gradle dependencies added (shimmer via built-in `rememberInfiniteTransition`)
