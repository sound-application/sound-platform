# Phase 5-A-2: Online Auth Configuration Repair

**Date:** 2026-05-14  
**Phase:** 5-A-2  
**Status:** ⚠️ REQUIRES MANUAL CONSOLE ACTION

---

## Root Cause

**`auth/configuration-not-found`** = The **Email/Password sign-in provider has not been enabled** in the Firebase Console for `sound-platform-dev`.

This is a **Console-only action**. The Firebase CLI and MCP server have no command to enable/disable sign-in providers. The app code and config are correct.

---

## Diagnostic Results

| Check | Result |
|---|---|
| Active Firebase project | ✅ `sound-platform-dev` |
| Firebase web app registered | ✅ `Sound Web` — `1:176645260774:web:66c38f39d3f73c22994227` |
| SDK config in `.env.local` matches live | ✅ All 6 fields match exactly |
| Firebase config correct | ✅ No mismatch |
| Email/Password provider enabled | ⚠️ **UNKNOWN via CLI — must verify/enable in Console** |
| Authorized domain `sound-platform-dev.web.app` | ⚠️ **UNKNOWN via CLI — must verify in Console** |
| Authorized domain `localhost` | ⚠️ **UNKNOWN via CLI — must verify in Console** |
| `.env.local` committed | ❌ NOT committed — correctly gitignored |
| Billing enabled | ✅ Yes (MCP env report) |
| Emulator used | ❌ NO — online-first |

---

## SDK Config Comparison

| Field | `.env.local` | Live SDK Config |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyAk...` | `AIzaSyAk...` ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | `sound-platform-dev.firebaseapp.com` | `sound-platform-dev.firebaseapp.com` ✅ |
| `VITE_FIREBASE_PROJECT_ID` | `sound-platform-dev` | `sound-platform-dev` ✅ |
| `VITE_FIREBASE_STORAGE_BUCKET` | `sound-platform-dev.firebasestorage.app` | `sound-platform-dev.firebasestorage.app` ✅ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `176645260774` | `176645260774` ✅ |
| `VITE_FIREBASE_APP_ID` | `1:176645260774:web:66c38f39d3f73c22994227` | `1:176645260774:web:66c38f39d3f73c22994227` ✅ |

**Conclusion: Firebase config is NOT the problem.** The issue is the Email/Password provider toggle in the Console.

---

## ⚠️ Required Manual Steps — Firebase Console

### Step 1: Enable Email/Password Provider

> **Exact URL:**  
> https://console.firebase.google.com/project/sound-platform-dev/authentication/providers

1. Open the URL above in your browser.
2. You will see the **Sign-in method** tab.
3. Find **Email/Password** in the list.
4. Click on it to expand.
5. Toggle the **Enable** switch to **ON**.
6. Click **Save**.

**Expected result:** Email/Password row shows a green "Enabled" badge.

---

### Step 2: Verify Authorized Domains

> **Exact URL:**  
> https://console.firebase.google.com/project/sound-platform-dev/authentication/settings

1. Open the URL above.
2. Click the **Authorized domains** tab (or scroll to Authorized Domains section).
3. Verify these domains are present:
   - `sound-platform-dev.web.app` ← must be here
   - `sound-platform-dev.firebaseapp.com` ← usually auto-added
   - `localhost` ← usually auto-added
4. If `sound-platform-dev.web.app` is **missing**, click **Add domain** and type:
   ```
   sound-platform-dev.web.app
   ```
   Then click **Add**.

**Expected result:** `sound-platform-dev.web.app` appears in the list.

---

### Step 3: Verify Auth is Initialized (First-Time Check)

> **Exact URL:**  
> https://console.firebase.google.com/project/sound-platform-dev/authentication

- If you see a **"Get started"** button → click it to initialize Firebase Authentication for this project.
- If you see the Users tab with a table → Authentication is already initialized.

---

## After Manual Steps — No Rebuild Needed

The app code, Firebase config, and build output are all correct.  
**After enabling the provider in Console:**

- Open https://sound-platform-dev.web.app/login
- Try signing up or logging in
- The `auth/configuration-not-found` error should be gone

**No rebuild or redeploy is required** — the issue is server-side provider configuration, not client code.

---

## What Was NOT the Problem

| Item | Status |
|---|---|
| Firebase web SDK config | ✅ Correct |
| `.env.local` values | ✅ Match live SDK config |
| `authDomain` field | ✅ Correct — `sound-platform-dev.firebaseapp.com` |
| App registration | ✅ `Sound Web` registered in project |
| Vite build baking env vars | ✅ Works — `VITE_APP_ENV=dev`, not `local` |
| Emulator accidentally connected | ✅ NOT connected — `VITE_APP_ENV=dev` skips emulator block |

---

## If Auth Initializes but Login Still Fails After Fix

Try this sequence:
1. Clear browser cache / open in Incognito
2. Visit https://sound-platform-dev.web.app/signup
3. Create a test account (e.g. `test@sounddev.local` / any password ≥ 6 chars)
4. Expected: redirected to home page `/`
5. If still failing: check browser console for the exact new error and report

---

## Test User Policy

- A test user may be created during verification.
- Document any test users in Firestore Auth console.
- Test users on `sound-platform-dev` do NOT affect production.
- They can be deleted via: https://console.firebase.google.com/project/sound-platform-dev/authentication/users

---

## Files Changed in This Phase

| File | Change |
|---|---|
| None | No code changes required — provider must be enabled in Console |

**No rebuild. No redeploy. No commit.**

---

## Next Steps After Console Fix

1. Verify login/signup works on https://sound-platform-dev.web.app
2. Confirm `auth/configuration-not-found` is gone
3. Proceed to **Phase 5-B**: Cloud Functions — `onUserCreate` trigger to populate `publicProfiles/{uid}`
