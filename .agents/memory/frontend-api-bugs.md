---
name: Frontend API contract bugs
description: Three correctness bugs found during initial code review, now fixed — important patterns to watch for
---

# Frontend API Contract Bugs (Fixed)

Three bugs found by code review and fixed in the initial setup session:

## 1. useClearAiSession wrong call shape (ai-settings.tsx)
- **Bug:** `clearSession.mutateAsync({ data: { sessionId } } as any)` — passing `{ data: { sessionId } }` instead of `{ sessionId }`
- **Fix:** `clearSession.mutateAsync({ sessionId })`
- **Why it matters:** Session history was never cleared; error was silently swallowed

## 2. Drive validation sentinel value (drive-config.tsx)  
- **Bug:** When API key was saved but user didn't re-enter it, the UI sent `"USE_SAVED_KEY"` as the API key to the backend validation endpoint — which used it literally, causing validation to always fail for already-configured setups
- **Fix:** Prompt user to re-enter the key; don't call the backend with a fake sentinel

## 3. Sync history status enum mismatch (drive-config.tsx)
- **Bug:** UI checked `record.status === 'completed'` but backend returns `'success'` — successful syncs showed a spinning clock icon instead of a green check
- **Fix:** Changed UI check to `'success'`

## Pattern to watch for
Always verify the generated client's actual TypeScript signature before calling mutation hooks. The generated client at `lib/api-client-react/src/generated/api.ts` is the source of truth for call shapes.
