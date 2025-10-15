# Healix App - JWT Authentication Setup

This React Native app now integrates with the Flask backend using JWT authentication.

## Configuration

1. **Update API Base URL** in `lib/api.ts`:
   ```typescript
   const API_BASE_URL = 'YOUR_BACKEND_URL/api';
   ```
   
   - iOS Simulator: `http://localhost:5000/api`
   - Android Emulator: `http://10.0.2.2:5000/api`
   - Physical device: Use your computer's IP (e.g., `http://192.168.1.100:5000/api`)
   - Production: Your deployed server URL

2. **Ensure Flask backend is running** on the configured URL

## How It Works

### Registration Flow
1. User fills basic info (`app/register/index.tsx`) → stored in registration store
2. User fills health details (`app/register/details.tsx`) → stored in registration store
3. On completion (`app/register/complete.tsx`):
   - Calls `POST /api/register` with all data
   - Receives JWT access + refresh tokens
   - Tokens stored in AsyncStorage
   - User data cached locally
   - Redirects to dashboard

### Sign-In Flow
1. User enters email/password (`app/signin/email.tsx`)
2. Calls `POST /api/login`
3. Receives JWT tokens on success
4. Fetches user profile from `GET /api/user` using access token
5. Stores tokens and caches user data locally
6. Redirects to dashboard

### Token Management (`lib/api.ts`)
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- Automatic token refresh on 401 responses
- All API calls use the `apiRequest()` helper which handles:
  - Attaching Authorization header
  - Auto-refreshing expired tokens
  - Error handling

### Available API Functions

```typescript
// Registration
await registerUser({
  full_name, email, password, dob, gender, blood_group, ...
});

// Login
await loginUser(email, password);

// Get current user profile (requires valid token)
await getCurrentUser();

// Logout (clears tokens)
await logoutUser();
```

## Testing

1. Start Flask backend:
   ```bash
   cd healix-web
   python main.py
   ```

2. Start React Native app:
   ```bash
   cd healix-app
   npm start
   ```

3. Register a new account or sign in with existing credentials

## Security Notes

- Tokens are stored in AsyncStorage (encrypted on iOS, less secure on Android)
- For production, consider using:
  - Secure storage libraries like `expo-secure-store`
  - Biometric authentication
  - Certificate pinning for API calls
  - HTTPS only

## Troubleshooting

**Network errors:**
- Check API_BASE_URL is correct for your platform
- Ensure Flask server is running and accessible
- Check firewall/network settings
- For physical devices, ensure they're on the same network

**Token expired:**
- Tokens auto-refresh if refresh token is valid
- If refresh token expires (30 days), user must sign in again

**CORS errors (web only):**
- Flask app has CORS enabled for `/api/*` endpoints
- If issues persist, check Flask CORS configuration in `main.py`
