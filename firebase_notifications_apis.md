# Firebase Notifications & Device Token APIs

All these endpoints accept `user_id` directly in the payload to make it friendly for mobile apps. If `user_id` is not passed, it will attempt to read the JWT auth cookie (for web).

---

### 0. Quick Test (Send Push Notification)
Use this API to verify that FCM tokens are correctly saving and that your Firebase Admin credentials can send real Push Notifications to devices. *This creates a database record AND pings the mobile device.*

- **URL:** `/api/v1/notifications/test-send`
- **Method:** `POST`
- **Body:**
```json
{
  "user_id": "paste_user_uuid_here",
  "title": "Hello from Postman!",
  "message": "Push notifications are working 🚀",
  "category": "system"
}
```

---

### 1. Save Device Token (FCM)
Updates the `fcm_token` column in the `users` table so you can target this specific device with push notifications.

- **URL:** `/api/v1/user/device-token`
- **Method:** `POST`
- **Body:**
```json
{
  "user_id": "paste_user_uuid_here",
  "fcm_token": "fcm_test_token_12345abcdef"
}
```

---

### 2. Get Notifications
Fetches a paginated list of notifications for the logged-in user, ordered by newest first. Also returns the total count of unread notifications.

- **URL:** `/api/v1/notifications/get?user_id=paste_user_uuid_here&page=1&limit=20`
- **Method:** `GET`
- **Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid...",
      "title": "Welcome!",
      "message": "Thanks for joining...",
      "type": "system",
      "category": "profile",
      "reference_id": null,
      "is_read": false,
      "created_at": "2026-03-12T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "unreadCount": 1
  }
}
```

---

### 3. Mark Notification as Read
Marks a specific notification as `is_read = true`.
**Note:** If you send an empty body `{}`, it will mark **ALL** of the user's notifications as read.

- **URL:** `/api/v1/notifications/mark-read`
- **Method:** `PUT`
- **Body (Single):**
```json
{
  "user_id": "paste_user_uuid_here",
  "notification_id": "a1b2c3d4-..."
}
```
- **Body (Mark All As Read):**
```json
{
  "user_id": "paste_user_uuid_here"
}
```

---

### 4. Delete Single Notification
Permanently deletes a specific notification.

- **URL:** `/api/v1/notifications/delete`
- **Method:** `DELETE`
- **Body:**
```json
{
  "user_id": "paste_user_uuid_here",
  "notification_id": "a1b2c3d4-..."
}
```

---

### 5. Clear All Notifications
Wipes out all notifications permanently for the logged-in user.

- **URL:** `/api/v1/notifications/clear-all`
- **Method:** `DELETE`
- **Body:**
```json
{
  "user_id": "paste_user_uuid_here"
}
```
