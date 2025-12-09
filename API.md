# WhaTele Chat API Documentation

Base URL: `http://localhost:5000/api`

---

## 🔐 Authentication

All endpoints except `/auth/register`, `/auth/login`, `/auth/verify-email/:token`, and `/auth/resend-verification` require authentication.

**Authentication Header:**

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 📍 Endpoints

### Authentication (`/api/auth`)

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "bio": "Optional bio",
  "phone": "Optional phone"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "user": {
    "id": "...",
    "username": "johndoe",
    "email": "john@example.com",
    "isEmailVerified": false
  }
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "emailOrUsername": "johndoe",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "johndoe",
    "email": "john@example.com",
    "publicKey": "...",
    "isEmailVerified": true
  }
}
```

#### Verify Email

```http
GET /api/auth/verify-email/:token
```

#### Resend Verification Email

```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

### Users (`/api/users`)

#### Search Users

```http
GET /api/users/search?q=john
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "count": 2,
  "users": [
    {
      "_id": "...",
      "username": "johndoe",
      "email": "john@example.com",
      "avatar": "https://...",
      "bio": "...",
      "online": true,
      "lastSeen": "2025-12-02T..."
    }
  ]
}
```

#### Get User by ID

```http
GET /api/users/:userId
Authorization: Bearer <token>
```

#### Get User's Public Key

```http
GET /api/users/:userId/public-key
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
}
```

#### Update Profile

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newusername",
  "bio": "Updated bio",
  "avatar": "https://cloudinary.com/..."
}
```

---

### Chats (`/api/chats`)

#### Create Private Chat

```http
POST /api/chats
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "other_user_id"
}
```

**Response:**

```json
{
  "success": true,
  "chat": {
    "_id": "...",
    "isGroupChat": false,
    "participants": [...],
    "latestMessage": null
  },
  "isNew": true
}
```

#### Create Group Chat

```http
POST /api/chats/group
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatName": "My Group",
  "participants": ["userId1", "userId2", "userId3"],
  "chatAvatar": "https://cloudinary.com/..." (optional)
}
```

**Note:** Maximum 49 participants (+ you = 50 total)

#### Get All Chats

```http
GET /api/chats
Authorization: Bearer <token>
```

#### Get Chat Details

```http
GET /api/chats/:chatId
Authorization: Bearer <token>
```

**Response includes participants with publicKeys for E2E encryption**

#### Update Group Info

```http
PUT /api/chats/:chatId/group
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatName": "Updated Name",
  "chatAvatar": "https://..."
}
```

**Only admins can update**

#### Add Participant to Group

```http
POST /api/chats/:chatId/participants
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_to_add_id"
}
```

**Only admins can add. Max 50 members enforced.**

#### Remove Participant from Group

```http
DELETE /api/chats/:chatId/participants/:userId
Authorization: Bearer <token>
```

**Only admins can remove**

#### Leave Group

```http
DELETE /api/chats/:chatId/leave
Authorization: Bearer <token>
```

---

### Messages (`/api/messages`)

#### Send Message (E2E Encrypted)

```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatId": "chat_id",
  "messageType": "text",
  "encryptedContent": "encrypted_message_content",
  "iv": "initialization_vector",
  "encryptedKeys": {
    "userId1": "encrypted_key_for_user1",
    "userId2": "encrypted_key_for_user2"
  },
  "mediaUrl": "https://cloudinary.com/..." (optional)
}
```

**Private Chat:** Only `encryptedContent` and `iv` needed
**Group Chat:** Include `encryptedKeys` object with encrypted AES key for each participant

**Response:**

```json
{
  "success": true,
  "message": {
    "_id": "...",
    "chat": "...",
    "sender": {...},
    "messageType": "text",
    "encryptedContent": "...",
    "status": "sent",
    "createdAt": "..."
  }
}
```

#### Get Chat Messages

```http
GET /api/messages/:chatId?page=1&limit=50
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "messages": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

#### Update Message Status

```http
PUT /api/messages/:messageId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "delivered"  // or "seen"
}
```

#### Delete Message

```http
DELETE /api/messages/:messageId?forAll=false
Authorization: Bearer <token>
```

**Query Parameters:**

- `forAll=true`: Delete for everyone (only sender, within 1 hour)
- `forAll=false`: Delete for me only

#### Forward Message

```http
POST /api/messages/:messageId/forward
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatId": "destination_chat_id"
}
```

**Note:** Frontend must re-encrypt message content for destination chat participants

#### Get Shared Media

```http
GET /api/messages/:chatId/media?type=image
Authorization: Bearer <token>
```

**Query Parameters:**

- `type`: Optional filter (`image` or `file`)

---

### Upload (`/api/upload`)

#### Upload Image

```http
POST /api/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  image: <file>
```

**Response:**

```json
{
  "success": true,
  "originalUrl": "https://res.cloudinary.com/...",
  "publicId": "whatele-chat/images/...",
  "format": "jpg",
  "width": 1920,
  "height": 1080,
  "fileName": "photo.jpg",
  "fileSize": 524288
}
```

#### Upload File

```http
POST /api/upload/file
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  file: <file>
```

#### Upload Media (with chat context)

```http
POST /api/upload/media
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  media: <file>
  chatId: <chat_id>
  messageId: <message_id>
```

**Creates Media record in database**

**File Limits:**

- Max size: 10MB
- Allowed types: images (jpg, png, gif, webp), documents (pdf, doc, docx, txt), videos (mp4, webm)

---

## 🔒 E2E Encryption Flow

### Sending Message (Private Chat)

1. Get recipient's public key: `GET /api/users/:userId/public-key`
2. Encrypt message with recipient's public key (RSA-OAEP)
3. Send encrypted message: `POST /api/messages`

### Sending Message (Group Chat)

1. Get all participants' public keys from chat details
2. Generate random AES-256 key
3. Encrypt message content with AES key
4. Encrypt AES key with each participant's public key
5. Send message with `encryptedKeys` object

### Receiving Message

1. Get encrypted message via Socket.io or API
2. For private chat: Decrypt with your private key
3. For group chat: Decrypt your encrypted key, then decrypt content

---

## 📊 Status Hierarchy

Messages follow this status progression:

- `sent` → `delivered` → `seen`

Status updates only move forward, never backward.

---

## ⚡ Socket.io Events

**Coming in Phase 3**

Real-time events for:

- New messages
- Typing indicators
- Online/offline status
- Message status updates
- Message deletion notifications

---

## ❌ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [...] // For validation errors
}
```

**Common Status Codes:**

- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (email not verified, not admin, etc.)
- `404`: Not Found
- `500`: Server Error

---

## 🧪 Testing with Postman/Insomnia

1. **Register User** → Save token from response
2. **Check Email** → Click verification link
3. **Login** → Get actual token to use
4. **Set Authorization** → Add `Bearer <token>` header to all requests
5. **Search Users** → Find someone to chat with
6. **Create Chat** → Start private or group chat
7. **Send Message** → With encrypted content
8. **Get Messages** → Retrieve chat history

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Server stores only encrypted message content
- Private keys never leave the client
- Email must be verified to access most endpoints
- Group member limit is strictly enforced at 50
