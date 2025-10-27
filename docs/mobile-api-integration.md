# Mobile API Integration Guide

This guide explains how to integrate your Flutter app with the Pool Service API using the new versioned mobile authentication endpoints.

## API Versioning Strategy

The API uses **URL path versioning** with the following structure:
- Current version: `/api/v1/`
- Future versions: `/api/v2/`, `/api/v3/`, etc.

This approach provides:
- **Backward compatibility**: Old versions remain functional
- **Clear versioning**: Easy to identify which version you're using
- **Gradual migration**: You can upgrade at your own pace

## Authentication Endpoints

### 1. Mobile Login
**POST** `/api/v1/auth/mobile-login`

Authenticates users and returns a JWT token for subsequent API calls.

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "userpassword",
  "recaptchaToken": "optional_recaptcha_token",
  "deviceInfo": {
    "deviceId": "unique_device_id",
    "deviceName": "iPhone 15 Pro",
    "platform": "ios",
    "appVersion": "1.0.0",
    "osVersion": "17.0"
  }
}
```

#### Response (Success)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "user@example.com",
      "emailVerified": "2024-01-01T00:00:00.000Z",
      "image": "https://example.com/avatar.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Response (Error)
```json
{
  "error": {
    "message": "Invalid credentials"
  }
}
```

### 2. Token Refresh
**POST** `/api/v1/auth/refresh`

Refreshes an expired JWT token.

#### Request Body
```json
{
  "refreshToken": "your_refresh_token",
  "deviceInfo": {
    "deviceId": "unique_device_id",
    "platform": "ios"
  }
}
```

### 3. Logout
**POST** `/api/v1/auth/logout`

Invalidates the current session.

#### Headers
```
Authorization: Bearer <your_jwt_token>
```

## Protected Endpoints

All endpoints under `/api/v1/` (except auth endpoints) require authentication.

### Authentication Header
Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Example: Get User Profile
**GET** `/api/v1/profile`

#### Headers
```
Authorization: Bearer <your_jwt_token>
```

#### Response
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "deviceInfo": {
        "deviceId": "unique_device_id",
        "platform": "ios"
      }
    }
  }
}
```

## Flutter Integration Example

### 1. API Client Setup

```dart
class ApiClient {
  static const String baseUrl = 'https://your-domain.com/api/v1';
  String? _token;
  
  // Login method
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? recaptchaToken,
    Map<String, dynamic>? deviceInfo,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/mobile-login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'recaptchaToken': recaptchaToken,
        'deviceInfo': deviceInfo ?? {
          'platform': Platform.isIOS ? 'ios' : 'android',
          'appVersion': '1.0.0',
          'osVersion': Platform.operatingSystemVersion,
        },
      }),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      _token = data['data']['token'];
      return data;
    } else {
      throw Exception('Login failed: ${response.body}');
    }
  }
  
  // Authenticated request method
  Future<Map<String, dynamic>> authenticatedRequest(
    String endpoint, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    if (_token == null) {
      throw Exception('Not authenticated');
    }
    
    final response = await http.request(
      Uri.parse('$baseUrl$endpoint'),
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token',
      },
      body: body != null ? jsonEncode(body) : null,
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Request failed: ${response.body}');
    }
  }
}
```

### 2. Authentication Service

```dart
class AuthService {
  final ApiClient _apiClient = ApiClient();
  final SharedPreferences _prefs = await SharedPreferences.getInstance();
  
  Future<bool> login(String email, String password) async {
    try {
      final response = await _apiClient.login(
        email: email,
        password: password,
      );
      
      // Store token securely
      await _prefs.setString('auth_token', response['data']['token']);
      
      return true;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }
  
  Future<void> logout() async {
    try {
      await _apiClient.authenticatedRequest('/auth/logout', method: 'POST');
    } catch (e) {
      print('Logout error: $e');
    } finally {
      // Clear stored token
      await _prefs.remove('auth_token');
    }
  }
  
  Future<Map<String, dynamic>?> getProfile() async {
    try {
      return await _apiClient.authenticatedRequest('/profile');
    } catch (e) {
      print('Get profile error: $e');
      return null;
    }
  }
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": {
    "message": "Error description"
  }
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid credentials or token)
- `403`: Forbidden (email not verified, etc.)
- `423`: Locked (account temporarily locked)
- `500`: Internal Server Error

## Security Considerations

1. **Token Storage**: Store JWT tokens securely in your Flutter app (use `flutter_secure_storage`)
2. **Token Expiration**: Implement automatic token refresh logic
3. **HTTPS Only**: Always use HTTPS in production
4. **Device Info**: Include device information for security tracking
5. **Rate Limiting**: Be aware of potential rate limits on authentication endpoints

## Migration Strategy

When new API versions are released:

1. **Test in staging**: Test your app against the new version
2. **Gradual rollout**: Update your app to use the new version
3. **Fallback support**: Keep support for the old version during transition
4. **Monitor metrics**: Track API usage and error rates

## Support

For API-related questions or issues, please refer to the API documentation or contact the development team.
