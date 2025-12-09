![MSG Logo](./client/public/image.png)

# MSG 🚀

**Fast like Telegram, Simple like WhatsApp**

A production-ready real-time messaging application built with the MERN stack, featuring military-grade end-to-end encryption, group chats, media sharing, video/audio calls, and comprehensive real-time features.

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Detailed Setup](#-detailed-setup)
- [Environment Configuration](#-environment-configuration)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🌟 Features

### Core Messaging

- ✅ **Real-time private messaging** - Instant 1-on-1 conversations
- 👥 **Group chats** - Create groups with up to 50 members
- 💬 **Rich text messaging** - Send formatted messages with emojis
- ⏩ **Message forwarding** - Forward messages to other chats
- 🗑️ **Message deletion** - Delete for yourself or everyone
- 📝 **Message editing** - Edit sent messages (coming soon)
- 🔍 **Message search** - Search through conversation history
- 📌 **Pinned messages** - Pin important messages in chats

### Media & Files

- 📷 **Image sharing** - Send photos with automatic compression
- 🎥 **Video sharing** - Share video files (coming soon)
- 📁 **File uploads** - Send documents and files
- 🖼️ **Media gallery** - View all shared media in a chat
- 🔄 **Image cropping** - Crop images before sending
- 📊 **File preview** - Preview files before downloading

### Real-time Features

- ✓✓ **Read receipts** - WhatsApp-style delivery and read indicators
- ⌨️ **Typing indicators** - See when someone is typing
- 🟢 **Online presence** - Real-time online/offline status
- 🕐 **Last seen** - View when users were last active
- 🔔 **Push notifications** - Desktop notifications for new messages
- 📱 **Multi-device sync** - Sync across multiple devices

### Communication

- 📞 **Voice calls** - WebRTC-powered audio calls
- 📹 **Video calls** - High-quality video calling
- 🎤 **Voice messages** - Record and send voice notes (coming soon)
- 📺 **Screen sharing** - Share your screen during calls (coming soon)

### User Management

- 🔐 **Secure authentication** - JWT-based auth with refresh tokens
- 📧 **Email verification** - Mandatory email verification
- 🚫 **Burner email blocking** - Prevents disposable email addresses
- 👤 **User profiles** - Customizable profiles with avatars
- 🔍 **Global search** - Find users across the platform
- 🚫 **Block users** - Block unwanted contacts (coming soon)

### Security & Privacy

- 🔒 **End-to-end encryption** - Messages encrypted client-side
- 🔑 **RSA-OAEP 2048-bit** - For private chat encryption
- 🔐 **AES-GCM 256-bit** - For group chat encryption
- 🛡️ **Private key security** - Keys never leave the client
- 🔏 **Encrypted media** - Images and files are encrypted
- 🔐 **Secure key storage** - IndexedDB for key management
- 🚨 **Security headers** - CORS, CSP, and other protections

## 🛠️ Tech Stack

### Backend

- **Node.js** (v16+) - JavaScript runtime
- **Express.js** (v5) - Web framework
- **MongoDB** (v5+) - NoSQL database
- **Mongoose** (v9) - MongoDB ODM
- **Socket.io** (v4.8) - Real-time bidirectional communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Cloudinary** - Media storage and CDN
- **EmailJS** - Email service for verification
- **Multer** - File upload handling

### Frontend

- **React** (v19) - UI library
- **Vite** (v7) - Build tool and dev server
- **Zustand** - State management
- **React Router** (v7) - Client-side routing
- **Socket.io Client** - Real-time client
- **Axios** - HTTP client
- **TailwindCSS** (v4) - Utility-first CSS
- **Lucide React** - Icon library
- **date-fns** - Date formatting
- **SimplePeer** - WebRTC wrapper for calls
- **LocalForage** - IndexedDB wrapper for key storage

### Security

- **Web Crypto API** - Client-side encryption
- **RSA-OAEP** - Asymmetric encryption for private chats
- **AES-GCM** - Symmetric encryption for group chats
- **CORS** - Cross-origin resource sharing
- **Express Validator** - Input validation

## 🏛️ Architecture

### System Overview

```
┌─────────────────┐         ┌─────────────────┐
│   React Client  │◄────────┤   Express API   │
│   (Port 5173)   │  HTTP   │   (Port 5000)   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ WebSocket                 │
         │ (Socket.io)               │
         │                           │
         └───────────┬───────────────┘
                     │
         ┌───────────▼───────────┐
         │   Socket.io Server    │
         │   Real-time Events    │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌─────▼─────┐   ┌─────▼─────┐
│MongoDB │    │Cloudinary │   │  EmailJS  │
│Database│    │   (CDN)   │   │  (Email)  │
└────────┘    └───────────┘   └───────────┘
```

### Encryption Flow

**Private Chats (RSA-OAEP):**
```
1. User A generates RSA key pair on registration
2. Public key stored in database, private key in IndexedDB
3. User A encrypts message with User B's public key
4. Encrypted message sent to server
5. Server stores encrypted message
6. User B decrypts with their private key
```

**Group Chats (AES-GCM):**
```
1. Group creator generates AES-256 key
2. Key encrypted with each member's RSA public key
3. Encrypted keys stored per member
4. Messages encrypted with shared AES key
5. Each member decrypts AES key with their RSA private key
6. Members decrypt messages with shared AES key
```

### Real-time Events

- `connection` - User connects to Socket.io
- `join_chat` - User joins a chat room
- `new_message` - New message broadcast
- `typing` / `stop_typing` - Typing indicators
- `message_delivered` - Message delivery confirmation
- `message_seen` - Message read receipt
- `user_online` / `user_offline` - Presence updates
- `call_user` / `answer_call` - WebRTC signaling
- `disconnect` - User disconnects

## 📋 Prerequisites

Before you begin, ensure you have:

### Required

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **npm** v7+ or **yarn** v1.22+ (comes with Node.js)
- **MongoDB** v5 or higher
  - Local: [Download MongoDB Community](https://www.mongodb.com/try/download/community)
  - Cloud: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- **Git** (for cloning the repository)

### Optional but Recommended

- **MongoDB Compass** - GUI for MongoDB
- **Postman** or **Insomnia** - API testing
- **VS Code** - Code editor with extensions:
  - ESLint
  - Prettier
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense

### External Services (Free Tiers Available)

- **Cloudinary Account** - For image uploads ([Sign up](https://cloudinary.com/))
- **EmailJS Account** - For email verification ([Sign up](https://www.emailjs.com/))

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone the repository
git clone <repository-url>
cd Realtime-chat-app

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd client
npm install
cd ..

# 4. Create environment files (see Environment Configuration section)
# Create .env in root directory
# Create .env in client directory

# 5. Start MongoDB (if using local)
net start MongoDB  # Windows
# or
sudo systemctl start mongod  # Linux
# or
brew services start mongodb-community  # macOS

# 6. Start backend server (in root directory)
npm run dev

# 7. Start frontend (in new terminal, from root)
cd client
npm run dev

# 8. Open http://localhost:5173 in your browser
```

## 🛠️ Detailed Setup

### Step 1: Clone the Repository

```bash
# Using HTTPS
git clone <repository-url>
cd Realtime-chat-app

# Or using SSH
git clone <ssh-url>
cd Realtime-chat-app
```

### Step 2: Backend Setup

#### Install Dependencies

```bash
# From the root directory
npm install
```

This installs:
- Express.js, Socket.io, Mongoose
- Authentication libraries (JWT, bcryptjs)
- File upload (Multer, Cloudinary)
- Email service (EmailJS, Nodemailer)
- Development tools (Nodemon)

#### Configure Backend Environment

Create `.env` file in the **root directory**:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/macOS
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://localhost:27017/whatele-chat

# Authentication
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long_change_in_production

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# EmailJS (Email Verification)
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
```

### Step 3: Frontend Setup

#### Install Dependencies

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Return to root
cd ..
```

This installs:
- React, React Router, Zustand
- Socket.io client, Axios
- TailwindCSS, Lucide icons
- WebRTC (SimplePeer)
- Encryption utilities

#### Configure Frontend Environment

Create `.env` file in the **client directory**:

```bash
cd client

# Windows PowerShell
Copy-Item .env.example .env

# Linux/macOS
cp .env.example .env

cd ..
```

Edit `client/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Step 4: Database Setup

#### Option A: Local MongoDB

**Windows:**
```bash
# Start MongoDB service
net start MongoDB

# Verify it's running
mongo --eval "db.version()"
```

**Linux:**
```bash
# Start MongoDB
sudo systemctl start mongod

# Enable on boot
sudo systemctl enable mongod

# Check status
sudo systemctl status mongod
```

**macOS:**
```bash
# Start MongoDB
brew services start mongodb-community

# Verify
mongo --eval "db.version()"
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Create a database user:
   - Database Access → Add New Database User
   - Username: `whatele_user`
   - Password: Generate secure password
4. Whitelist IP address:
   - Network Access → Add IP Address
   - For development: `0.0.0.0/0` (allow all)
   - For production: Your server's IP
5. Get connection string:
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your database user password
6. Update `.env`:
   ```env
   MONGO_URI=mongodb+srv://whatele_user:<password>@cluster0.xxxxx.mongodb.net/whatele-chat?retryWrites=true&w=majority
   ```

### Step 5: External Services Configuration

#### Cloudinary Setup (Image Storage)

1. **Sign up** at [cloudinary.com](https://cloudinary.com/)
2. **Navigate to Dashboard**
3. **Copy credentials:**
   - Cloud Name: `dxxxxxxxx`
   - API Key: `123456789012345`
   - API Secret: `abcdefghijklmnopqrstuvwxyz`
4. **Update `.env`:**
   ```env
   CLOUDINARY_CLOUD_NAME=dxxxxxxxx
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
   ```

#### EmailJS Setup (Email Verification)

1. **Create Account** at [emailjs.com](https://www.emailjs.com/)

2. **Add Email Service:**
   - Go to Email Services → Add New Service
   - Select Gmail (or your provider)
   - Connect your email account
   - Copy the **Service ID** (e.g., `service_abc123`)

3. **Create Email Template:**
   - Go to Email Templates → Create New Template
   - **Subject:** `Verify Your Email - WhaTele Chat`
   - **Content:**
     ```html
     <h2>Welcome to WhaTele Chat!</h2>
     <p>Hi {{to_name}},</p>
     <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
     <a href="{{verification_url}}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Verify Email</a>
     <p>Or copy this link: {{verification_url}}</p>
     <p>This link expires in 24 hours.</p>
     <p>If you didn't create an account, please ignore this email.</p>
     ```
   - Save and copy the **Template ID** (e.g., `template_xyz789`)

4. **Get API Keys:**
   - Click your profile → Account
   - Go to API Keys section
   - Copy **Public Key** and **Private Key**

5. **Update `.env`:**
   ```env
   EMAILJS_SERVICE_ID=service_abc123
   EMAILJS_TEMPLATE_ID=template_xyz789
   EMAILJS_PUBLIC_KEY=your_public_key_here
   EMAILJS_PRIVATE_KEY=your_private_key_here
   ```

### Step 6: Start the Application

#### Start Backend Server

```bash
# From root directory
# Development mode (auto-reload on changes)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ MongoDB Connected: localhost (or your Atlas cluster)
🚀 Server running on port 5000
📡 Socket.io server ready
🌍 Environment: development
```

#### Start Frontend Development Server

```bash
# Open new terminal
cd client

# Start Vite dev server
npm run dev
```

You should see:
```
  VITE v7.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 7: Verify Installation

1. **Open browser** to `http://localhost:5173`
2. **Register a new account**
3. **Check email** for verification link
4. **Verify email** and log in
5. **Test features:**
   - Send a message to yourself
   - Upload an image
   - Create a group chat

## 🔐 Environment Configuration

### Backend Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `5000` | Yes |
| `NODE_ENV` | Environment | `development` or `production` | Yes |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/whatele-chat` | Yes |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your_secret_key_here` | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `dxxxxxxxx` | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abcdefg...` | Yes |
| `EMAILJS_SERVICE_ID` | EmailJS service ID | `service_abc123` | Yes |
| `EMAILJS_TEMPLATE_ID` | EmailJS template ID | `template_xyz789` | Yes |
| `EMAILJS_PUBLIC_KEY` | EmailJS public key | `your_public_key` | Yes |
| `EMAILJS_PRIVATE_KEY` | EmailJS private key | `your_private_key` | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` | Yes |

### Frontend Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` | Yes |
| `VITE_SOCKET_URL` | Socket.io server URL | `http://localhost:5000` | Yes |

### Security Best Practices

- ⚠️ **Never commit `.env` files** to version control
- 🔑 **Use strong JWT secrets** (min 32 characters, random)
- 🔒 **Change default secrets** in production
- 🌐 **Restrict CORS** in production to your domain only
- 🛡️ **Use environment-specific configs** for dev/staging/prod
- 🔐 **Rotate API keys** regularly
- 📊 **Monitor API usage** on Cloudinary and EmailJS

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "507f1f77bcf86cd799439011"
}
```

#### Verify Email
```http
GET /api/auth/verify-email/:token
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "emailOrUsername": "johndoe",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "publicKey": "-----BEGIN PUBLIC KEY-----...",
    "online": true
  }
}
```

### Chat Endpoints

#### Get All Chats
```http
GET /api/chats
Authorization: Bearer <token>
```

#### Create Private Chat
```http
POST /api/chats/private
Authorization: Bearer <token>
Content-Type: application/json

{
  "participantId": "507f1f77bcf86cd799439012"
}
```

#### Create Group Chat
```http
POST /api/chats/group
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Project Team",
  "participantIds": ["507f...", "508f..."],
  "encryptedGroupKeys": {
    "507f...": "encrypted_key_1",
    "508f...": "encrypted_key_2"
  }
}
```

### Message Endpoints

#### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatId": "507f1f77bcf86cd799439013",
  "encryptedContent": "U2FsdGVkX1...",
  "messageType": "text"
}
```

#### Get Chat Messages
```http
GET /api/messages/:chatId?page=1&limit=50
Authorization: Bearer <token>
```

#### Delete Message
```http
DELETE /api/messages/:messageId?deleteFor=all
Authorization: Bearer <token>
```

### User Endpoints

#### Search Users
```http
GET /api/users/search?query=john
Authorization: Bearer <token>
```

#### Get User Profile
```http
GET /api/users/:userId
Authorization: Bearer <token>
```

### Upload Endpoints

#### Upload Image
```http
POST /api/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image_file>
chatId: "507f1f77bcf86cd799439013"
```

### Socket.io Events

#### Client → Server

- `join_chat` - Join a chat room
- `leave_chat` - Leave a chat room
- `typing` - User started typing
- `stop_typing` - User stopped typing
- `message_delivered` - Confirm message delivery
- `message_seen` - Mark messages as seen
- `call_user` - Initiate WebRTC call
- `answer_call` - Answer incoming call

#### Server → Client

- `new_message` - New message received
- `user_typing` - User is typing
- `user_stop_typing` - User stopped typing
- `message_status_update` - Message status changed
- `messages_seen` - Messages marked as seen
- `user_online` - User came online
- `user_offline` - User went offline
- `call_user` - Incoming call
- `call_ringing` - Call is ringing

For complete API documentation, see [API.md](./API.md)

## 📁 Project Structure

```
Realtime-chat-app/
├── client/                    # Frontend React application
│   ├── public/                # Static assets
│   │   ├── chat-wllp.png      # App logo
│   │   └── vite.svg           # Vite logo
│   ├── src/
│   │   ├── api/               # API service layer
│   │   │   ├── auth.js        # Auth API calls
│   │   │   ├── chats.js       # Chat API calls
│   │   │   ├── messages.js    # Message API calls
│   │   │   └── users.js       # User API calls
│   │   ├── assets/            # Images, icons
│   │   ├── components/        # React components
│   │   │   ├── Auth/          # Login, Register
│   │   │   ├── Chat/          # ChatList, ChatWindow
│   │   │   ├── Message/       # MessageBubble, MessageInput
│   │   │   ├── Modals/        # Various modals
│   │   │   └── UI/            # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAuth.js     # Authentication hook
│   │   │   ├── useSocket.js   # Socket.io hook
│   │   │   └── useEncryption.js # Encryption hook
│   │   ├── pages/             # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Chat.jsx
│   │   │   └── VerifyEmail.jsx
│   │   ├── store/             # Zustand state management
│   │   │   ├── authStore.js   # Auth state
│   │   │   ├── chatStore.js   # Chat state
│   │   │   └── messageStore.js # Message state
│   │   ├── utils/             # Utility functions
│   │   │   ├── encryption.js  # E2E encryption
│   │   │   ├── keyStorage.js  # IndexedDB key storage
│   │   │   └── formatters.js  # Date/time formatters
│   │   ├── App.jsx            # Main App component
│   │   ├── main.jsx           # Entry point
│   │   ├── socket.js          # Socket.io client setup
│   │   ├── polyfills.js       # Browser polyfills
│   │   ├── App.css            # App styles
│   │   └── index.css          # Global styles
│   ├── .env                   # Frontend environment variables
│   ├── .env.example           # Frontend env template
│   ├── vite.config.js         # Vite configuration
│   ├── tailwind.config.js     # TailwindCSS config
│   ├── package.json           # Frontend dependencies
│   └── index.html             # HTML template
├── models/                    # MongoDB schemas
│   ├── User.js                # User model
│   ├── Chat.js                # Chat model
│   ├── Message.js             # Message model
│   └── Media.js               # Media model
├── routes/                    # Express API routes
│   ├── auth.js                # Authentication routes
│   ├── chats.js               # Chat routes
│   ├── messages.js            # Message routes
│   ├── users.js               # User routes
│   └── upload.js              # File upload routes
├── middleware/                # Express middleware
│   ├── auth.js                # JWT authentication
│   └── error.js               # Error handler
├── sockets/                   # Socket.io handlers
│   └── index.js               # Socket event handlers
├── utils/                     # Backend utilities
│   ├── email.js               # Email service
│   ├── burnerEmails.js        # Disposable email detection
│   ├── cloudinary.js          # Cloudinary helper
│   └── mediaEncryption.js     # Media encryption
├── uploads/                   # Temporary upload directory
├── server.js                  # Main server file
├── .env                       # Backend environment variables
├── .env.example               # Backend env template
├── .gitignore                 # Git ignore rules
├── package.json               # Backend dependencies
├── README.md                  # This file
├── SETUP.md                   # Quick setup guide
├── API.md                     # API documentation
└── SOCKET_EVENTS.md           # Socket.io events documentation
```

## 🚀 Deployment

### Backend Deployment (Heroku)

1. **Install Heroku CLI**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create whatele-chat-api
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGO_URI=your_mongodb_atlas_uri
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set CLOUDINARY_CLOUD_NAME=your_cloud_name
   heroku config:set CLOUDINARY_API_KEY=your_api_key
   heroku config:set CLOUDINARY_API_SECRET=your_api_secret
   heroku config:set EMAILJS_SERVICE_ID=your_service_id
   heroku config:set EMAILJS_TEMPLATE_ID=your_template_id
   heroku config:set EMAILJS_PUBLIC_KEY=your_public_key
   heroku config:set EMAILJS_PRIVATE_KEY=your_private_key
   heroku config:set FRONTEND_URL=https://your-frontend-domain.com
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to Client Directory**
   ```bash
   cd client
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

5. **Set Environment Variables in Vercel Dashboard**
   - Go to your project settings
   - Add `VITE_API_URL` and `VITE_SOCKET_URL`
   - Redeploy

### Alternative: Docker Deployment

**Backend Dockerfile:**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/whatele-chat
    depends_on:
      - mongo
  
  frontend:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - backend
  
  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solutions:**
- **Windows:** Start MongoDB service
  ```bash
  net start MongoDB
  ```
- **Linux:** Start MongoDB daemon
  ```bash
  sudo systemctl start mongod
  sudo systemctl status mongod
  ```
- **macOS:** Start MongoDB via Homebrew
  ```bash
  brew services start mongodb-community
  ```
- **MongoDB Atlas:** 
  - Check connection string is correct
  - Whitelist your IP: `0.0.0.0/0` for development
  - Verify database user credentials
  - Check network access settings

#### 2. Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solutions:**
- **Find and kill process (Windows):**
  ```bash
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```
- **Find and kill process (Linux/macOS):**
  ```bash
  lsof -ti:5000 | xargs kill -9
  ```
- **Change port:** Edit `.env` and set `PORT=5001`

#### 3. Email Verification Not Working

**Error:** Email not received or sending fails

**Solutions:**
- Check EmailJS credentials are correct
- Verify EmailJS service is active
- Check spam/junk folder
- Ensure template variables match: `{{to_name}}`, `{{verification_url}}`
- Test EmailJS in their dashboard first
- Check EmailJS usage limits (free tier: 200 emails/month)

#### 4. Cloudinary Upload Fails

**Error:** `Error uploading to Cloudinary`

**Solutions:**
- Verify Cloudinary credentials in `.env`
- Check file size (free tier: 10MB limit)
- Ensure file format is supported (jpg, png, gif, webp)
- Check Cloudinary usage limits
- Test upload in Cloudinary dashboard

#### 5. Socket.io Connection Failed

**Error:** `WebSocket connection failed` or `Transport error`

**Solutions:**
- Check backend server is running
- Verify `VITE_SOCKET_URL` in `client/.env`
- Check CORS settings in `server.js`
- Ensure firewall allows WebSocket connections
- Try different transport: Add `transports: ['websocket', 'polling']`

#### 6. JWT Token Invalid

**Error:** `Authentication error: Invalid token`

**Solutions:**
- Clear browser localStorage and cookies
- Ensure `JWT_SECRET` is same in `.env`
- Check token expiration (default: 7 days)
- Re-login to get new token

#### 7. Encryption/Decryption Errors

**Error:** `Failed to decrypt message` or `Invalid key`

**Solutions:**
- Clear IndexedDB: Browser DevTools → Application → IndexedDB → Delete
- Re-register account to generate new keys
- Check browser supports Web Crypto API (all modern browsers)
- Ensure private key exists in IndexedDB

#### 8. Frontend Build Fails

**Error:** `Build failed` or module errors

**Solutions:**
- Delete `node_modules` and reinstall:
  ```bash
  cd client
  rm -rf node_modules package-lock.json
  npm install
  ```
- Clear Vite cache:
  ```bash
  rm -rf .vite
  ```
- Check Node.js version: `node -v` (should be v16+)

#### 9. CORS Errors

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solutions:**
- Check `FRONTEND_URL` in backend `.env` matches frontend URL
- Verify CORS configuration in `server.js`
- For development, ensure frontend runs on `http://localhost:5173`
- Clear browser cache

#### 10. Images Not Loading

**Error:** Broken image icons or 404 errors

**Solutions:**
- Check Cloudinary URLs are valid
- Verify images uploaded successfully
- Check browser console for errors
- Ensure Cloudinary account is active
- Check image URLs in database

### Performance Issues

#### Slow Message Loading

- Reduce message pagination limit (default: 50)
- Add database indexes (already configured)
- Use MongoDB Atlas for better performance
- Enable message caching

#### High Memory Usage

- Limit concurrent Socket.io connections
- Implement message cleanup for old chats
- Optimize image compression settings
- Use production build for frontend

### Development Tips

- **Enable debug logs:** Set `NODE_ENV=development`
- **Monitor MongoDB:** Use MongoDB Compass
- **Test API:** Use Postman collection (see API.md)
- **Check Socket events:** Use Socket.io admin UI
- **Profile performance:** Use React DevTools Profiler

### Getting Help

1. Check existing issues in the repository
2. Review documentation: README.md, SETUP.md, API.md
3. Enable debug mode and check logs
4. Create detailed issue with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version, browser)
   - Relevant code snippets

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs

1. Check if bug already reported
2. Create detailed issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details

### Suggesting Features

1. Check if feature already requested
2. Create feature request with:
   - Clear use case
   - Proposed solution
   - Alternative solutions considered
   - Mockups/wireframes if applicable

### Pull Requests

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation
4. **Test thoroughly**
   - Test all affected features
   - Check for console errors
   - Test on different browsers
5. **Commit changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open Pull Request**
   - Describe changes clearly
   - Reference related issues
   - Add screenshots/videos if UI changes

### Code Style Guidelines

- **JavaScript:** Use ES6+ features
- **React:** Functional components with hooks
- **Naming:** camelCase for variables, PascalCase for components
- **Comments:** Explain why, not what
- **Formatting:** Use Prettier (already configured)
- **Linting:** Fix ESLint warnings

## 📚 Additional Resources

### Documentation

- [API Documentation](./API.md) - Complete API reference
- [Socket Events](./SOCKET_EVENTS.md) - Real-time event documentation
- [Setup Guide](./SETUP.md) - Quick setup instructions

### Technologies

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Socket.io Documentation](https://socket.io/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

### External Services

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [MongoDB Atlas](https://www.mongodb.com/docs/atlas/)

## 🔐 Security

### Reporting Security Issues

If you discover a security vulnerability, please email dev@andrewdosumu.com instead of using the issue tracker.

### Security Best Practices

- ✅ End-to-end encryption for all messages
- ✅ JWT authentication with secure secrets
- ✅ Password hashing with bcrypt
- ✅ Email verification required
- ✅ Burner email detection
- ✅ CORS protection
- ✅ Input validation and sanitization
- ✅ Rate limiting (recommended for production)
- ✅ HTTPS in production (required)
- ✅ Environment variables for secrets

## 📝 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Built with ❤️ by the MSG Chat team(its just Andrew haha)

## ⭐ Acknowledgments

- Inspired by WhatsApp and Telegram
- Built with amazing open-source technologies
- Thanks to all contributors

---

**🚀 Ready to chat?** Follow the [Quick Start](#-quick-start) guide and start messaging!

**🐛 Found a bug?** Check [Troubleshooting](#-troubleshooting) or open an issue.

**💡 Have an idea?** We'd love to hear it! Open a feature request.

**❤️ Like the project?** Give it a star ⭐ and share with others!
