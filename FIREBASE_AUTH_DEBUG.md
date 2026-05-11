# Firebase Authentication Debug Guide

## Critical Issue: 401 Errors on Payment API

If you're seeing "Failed to load resource: 401 (Unauthorized)" errors when trying to make payments, here's how to diagnose and fix:

## 1. Check Firebase Admin Initialization ✅

Run this command to see if Firebase Admin is initialized:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "firebase": "✅ initialized",
  "timestamp": "2026-05-10T..."
}
```

If you see `"firebase": "❌ NOT initialized"`, then the problem is Firebase Admin setup.

## 2. Verify FIREBASE_SERVICE_ACCOUNT_BASE64 Environment Variable

This is the most common issue:

### Option A: Using `.env` file

Add this to your `.env` file in the server directory:

```bash
# Get your Firebase service account JSON file from Firebase Console
# Then base64 encode it and paste here:
FIREBASE_SERVICE_ACCOUNT_BASE64=<your_base64_encoded_json>
```

### Option B: Encode Your Service Account

1. Get your Firebase service account JSON from [Firebase Console](https://console.firebase.google.com)
   - Go to Project Settings → Service Accounts → Generate New Private Key
   
2. Base64 encode it:
   ```bash
   # On Windows (PowerShell):
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content -Raw 'path/to/serviceAccountKey.json')))
   
   # On Mac/Linux:
   cat serviceAccountKey.json | base64
   ```

3. Copy the output and set as environment variable:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_BASE64=<your_base64_string>
   ```

## 3. Test Token Verification

1. Get a Firebase ID token from your logged-in user (in browser console):
   ```javascript
   const user = firebase.auth().currentUser;
   const token = await user.getIdToken(true);
   console.log('Token:', token);
   ```

2. Test the auth middleware with this token:
   ```bash
   curl -H "Authorization: Bearer <your_token>" http://localhost:5000/api/payments/plans
   ```

   This should work (plans endpoint is public but will verify the token works)

## 4. Common Error Codes

In your server logs, look for these error codes:

| Code | Meaning | Fix |
|------|---------|-----|
| `FIREBASE_NOT_INIT` | Firebase Admin not initialized | Check FIREBASE_SERVICE_ACCOUNT_BASE64 env var |
| `NO_TOKEN` | Authorization header missing | Client should send token in header |
| `INVALID_TOKEN_FORMAT` | Token format wrong | Should be `Bearer <token>` |
| `TOKEN_EXPIRED` | Firebase token expired | Client will auto-refresh, just retry |
| `INVALID_PAYLOAD` | Token decoded but missing uid | Firebase credentials issue |
| `VERIFY_FAILED` | Token verification failed | Usually means invalid service account or wrong Firebase project |

## 5. Detailed Server Logs

The updated middleware now logs detailed errors. Restart server and watch logs:

```bash
npm run start
# or
nodemon server.js
```

Look for lines like:
```
[auth] Token verification failed: { code: 'auth/argument-error', message: '...', tokenLength: 1234 }
```

## 6. Verify Database Connection

Also ensure MongoDB is connected:

```bash
curl http://localhost:5000/api/health
```

Should show both Firebase and database connection status.

## 7. If Still Not Working

1. **Clear cache**: Stop server, delete node_modules, run `npm install`
2. **Restart Everything**:
   ```bash
   npm run dev  # or npm run start
   ```
3. **Check the server logs** for Firebase initialization errors
4. **Verify environment variables** are loaded:
   ```bash
   # In your .env file, check:
   FIREBASE_SERVICE_ACCOUNT_BASE64=... (should exist)
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_PROJECT_ID=... (must match client and server)
   ```

## 8. Full Diagnostic Checklist

- [ ] Server is running without errors
- [ ] `/api/health` endpoint returns Firebase initialized
- [ ] Firebase service account Base64 env var is set
- [ ] Token can be obtained in browser (user logged in)
- [ ] Token verification works (test curl command above)
- [ ] MongoDB connection is active
- [ ] Client is sending Authorization header with token

## Emergency Fix

If Firebase is completely broken, you can temporarily use this simpler auth for testing:

1. In `server/middlewares/auth.js`, replace token verification with:
   ```javascript
   // TEMPORARY: Accept any token (DO NOT USE IN PRODUCTION)
   req.user = {
     uid: 'test-uid',
     email: 'test@example.com'
   };
   next();
   ```

But please fix the Firebase setup instead!

---

**Last Updated**: 2026-05-10
**Related Files**: 
- `server/middlewares/auth.js` (token verification)
- `server/server.js` (Firebase initialization)
- `client/src/utils/api.js` (token sending)
