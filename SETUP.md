# 🚀 WhaTele Chat - Complete Setup Guide

**Get your chat app running in 15 minutes!**

This guide walks you through every step needed to set up WhaTele Chat from scratch. Perfect for beginners and experienced developers alike.

## 📚 Table of Contents

1. [Prerequisites Check](#1-prerequisites-check)
2. [Project Setup](#2-project-setup)
3. [Backend Configuration](#3-backend-configuration)
4. [Frontend Configuration](#4-frontend-configuration)
5. [Database Setup](#5-database-setup)
6. [External Services](#6-external-services)
7. [Running the Application](#7-running-the-application)
8. [Verification & Testing](#8-verification--testing)
9. [Common Issues](#9-common-issues)
10. [Next Steps](#10-next-steps)

---

## 1. Prerequisites Check

Before starting, ensure you have these installed:

### ✅ Required Software

**Node.js (v16 or higher)**
```bash
# Check if installed
node --version
# Should show: v16.x.x or higher

# If not installed, download from:
# https://nodejs.org/ (LTS version recommended)
```

**npm (v7 or higher)**
```bash
# Check if installed (comes with Node.js)
npm --version
# Should show: 7.x.x or higher
```

**Git**
```bash
# Check if installed
git --version
# Should show: git version 2.x.x

# If not installed:
# Windows: https://git-scm.com/download/win
# macOS: brew install git
# Linux: sudo apt install git
```

**MongoDB (v5 or higher)**
```bash
# Check if installed
mongo --version
# OR
mongod --version

# If not installed:
# Download from: https://www.mongodb.com/try/download/community
# OR use MongoDB Atlas (cloud) - see Database Setup section
```

### 📝 Required Accounts (Free)

- [ ] **Cloudinary Account** - For image uploads ([Sign up](https://cloudinary.com/))
- [ ] **EmailJS Account** - For email verification ([Sign up](https://www.emailjs.com/))
- [ ] **MongoDB Atlas** (Optional) - Cloud database ([Sign up](https://www.mongodb.com/cloud/atlas))

---

## 2. Project Setup

### Step 2.1: Clone or Navigate to Project

**If you haven't cloned yet:**
```bash
# Clone the repository
git clone <repository-url>
cd Realtime-chat-app
```

**If you already have the project:**
```bash
# Navigate to project directory
cd c:\Users\Tooni\Documents\Realtime-chat-app
# OR on Linux/macOS:
cd ~/Documents/Realtime-chat-app
```

### Step 2.2: Install Backend Dependencies

```bash
# Make sure you're in the root directory
pwd  # Should show: .../Realtime-chat-app

# Install all backend dependencies
npm install
```

**What gets installed:**
- Express.js (web framework)
- Socket.io (real-time communication)
- Mongoose (MongoDB ODM)
- JWT, bcryptjs (authentication)
- Cloudinary, Multer (file uploads)
- EmailJS (email service)
- And more...

**Expected output:**
```
added 150+ packages in 30s
```

### Step 2.3: Install Frontend Dependencies

```bash
# Navigate to client directory
cd client

# Install all frontend dependencies
npm install

# Go back to root
cd ..
```

**What gets installed:**
- React, React Router (UI framework)
- Vite (build tool)
- Socket.io Client (real-time client)
- TailwindCSS (styling)
- Zustand (state management)
- And more...

**Expected output:**
```
added 200+ packages in 45s
```

---

## 3. Backend Configuration

### Step 3.1: Create Backend .env File

**Windows (PowerShell):**
```powershell
# Copy from example
Copy-Item .env.example .env

# OR create manually
New-Item -Path . -Name ".env" -ItemType "file"
```

**Linux/macOS:**
```bash
# Copy from example
cp .env.example .env

# OR create manually
touch .env
```

### Step 3.2: Edit Backend .env File

Open `.env` in your text editor and add:

```env
# ========================================
# SERVER CONFIGURATION
# ========================================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ========================================
# DATABASE
# ========================================
# For local MongoDB:
MONGO_URI=mongodb://localhost:27017/whatele-chat

# For MongoDB Atlas (cloud):
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/whatele-chat

# ========================================
# AUTHENTICATION
# ========================================
# IMPORTANT: Change this to a random 32+ character string in production!
JWT_SECRET=whatele_super_secret_jwt_key_change_this_in_production_12345

# ========================================
# CLOUDINARY (Image Storage)
# ========================================
# Get these from: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# ========================================
# EMAILJS (Email Verification)
# ========================================
# Get these from: https://dashboard.emailjs.com/
EMAILJS_SERVICE_ID=your_service_id_here
EMAILJS_TEMPLATE_ID=your_template_id_here
EMAILJS_PUBLIC_KEY=your_public_key_here
EMAILJS_PRIVATE_KEY=your_private_key_here
```

**⚠️ Important Notes:**
- Don't use quotes around values
- No spaces around `=` sign
- Keep `.env` file secret (never commit to Git)
- We'll fill in Cloudinary and EmailJS values in Step 6

---

## 4. Frontend Configuration

### Step 4.1: Create Frontend .env File

```bash
# Navigate to client directory
cd client
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
# OR
New-Item -Path . -Name ".env" -ItemType "file"
```

**Linux/macOS:**
```bash
cp .env.example .env
# OR
touch .env
```

### Step 4.2: Edit Frontend .env File

Open `client/.env` and add:

```env
# ========================================
# API CONFIGURATION
# ========================================
# Backend API URL (no trailing slash)
VITE_API_URL=http://localhost:5000/api

# Socket.io server URL (no trailing slash)
VITE_SOCKET_URL=http://localhost:5000
```

**💡 Production URLs:**
When deploying, change these to your production URLs:
```env
VITE_API_URL=https://your-api-domain.com/api
VITE_SOCKET_URL=https://your-api-domain.com
```

```bash
# Go back to root directory
cd ..
```

---

## 5. Database Setup

### Choose Your Database Option

You have two options: Local MongoDB or Cloud (MongoDB Atlas)

### Option A: Local MongoDB (Recommended for Development)

#### Windows

**1. Check if MongoDB is installed:**
```powershell
mongo --version
# OR
mongod --version
```

**2. If not installed, download and install:**
- Go to: https://www.mongodb.com/try/download/community
- Download MongoDB Community Server
- Run installer (choose "Complete" installation)
- Install as Windows Service (check the box)

**3. Start MongoDB:**
```powershell
# Run as Administrator
net start MongoDB

# Verify it's running
mongo --eval "db.version()"
```

**4. Keep this in your `.env`:**
```env
MONGO_URI=mongodb://localhost:27017/whatele-chat
```

#### Linux (Ubuntu/Debian)

**1. Install MongoDB:**
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Update and install
sudo apt update
sudo apt install -y mongodb-org
```

**2. Start MongoDB:**
```bash
sudo systemctl start mongod
sudo systemctl enable mongod  # Start on boot
sudo systemctl status mongod  # Check status
```

#### macOS

**1. Install via Homebrew:**
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@5.0
```

**2. Start MongoDB:**
```bash
brew services start mongodb-community@5.0

# Verify
mongo --eval "db.version()"
```

### Option B: MongoDB Atlas (Cloud Database)

**Perfect for production or if you don't want to install MongoDB locally**

#### Step 1: Create Account
1. Go to: https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up with email or Google

#### Step 2: Create Cluster
1. Choose **FREE** tier (M0 Sandbox)
2. Select cloud provider: **AWS** (recommended)
3. Select region: Choose closest to you
4. Cluster name: `whatele-chat` (or any name)
5. Click "Create Cluster" (takes 3-5 minutes)

#### Step 3: Create Database User
1. Go to **Database Access** (left sidebar)
2. Click "Add New Database User"
3. Authentication Method: **Password**
4. Username: `whatele_user`
5. Password: Click "Autogenerate Secure Password" and **SAVE IT**
6. Database User Privileges: **Read and write to any database**
7. Click "Add User"

#### Step 4: Whitelist IP Address
1. Go to **Network Access** (left sidebar)
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your server's specific IP
5. Click "Confirm"

#### Step 5: Get Connection String
1. Go to **Database** (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: **Node.js**, Version: **4.1 or later**
5. Copy the connection string:
   ```
   mongodb+srv://whatele_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password
7. Add database name: `/whatele-chat` before the `?`
   ```
   mongodb+srv://whatele_user:YourPassword123@cluster0.xxxxx.mongodb.net/whatele-chat?retryWrites=true&w=majority
   ```

#### Step 6: Update .env
```env
MONGO_URI=mongodb+srv://whatele_user:YourPassword123@cluster0.xxxxx.mongodb.net/whatele-chat?retryWrites=true&w=majority
```

---

## 6. External Services

### Step 6.1: Cloudinary Setup (Image Storage)

**Why Cloudinary?** Free tier includes 25GB storage and 25GB bandwidth/month

#### 1. Create Account
- Go to: https://cloudinary.com/
- Click "Sign Up for Free"
- Fill in details or sign up with Google

#### 2. Get Credentials
- After login, you'll see the **Dashboard**
- Look for "Account Details" section
- You'll see:
  ```
  Cloud name: dxxxxxxxx
  API Key: 123456789012345
  API Secret: abcdefghijklmnopqrstuvwxyz (click "eye" icon to reveal)
  ```

#### 3. Update .env
```env
CLOUDINARY_CLOUD_NAME=dxxxxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

#### 4. Test Upload (Optional)
- Go to Media Library in Cloudinary dashboard
- Try uploading a test image
- If successful, you're good to go!

### Step 6.2: EmailJS Setup (Email Verification)

**Why EmailJS?** Free tier includes 200 emails/month, no credit card required

#### 1. Create Account
- Go to: https://www.emailjs.com/
- Click "Sign Up"
- Use email or Google sign-in

#### 2. Add Email Service
- Click "Add New Service"
- Choose **Gmail** (or your email provider)
- Click "Connect Account"
- Sign in with your Gmail
- Service Name: `WhaTele Chat`
- Click "Create Service"
- **Copy the Service ID** (e.g., `service_abc123`)

#### 3. Create Email Template
- Go to "Email Templates" tab
- Click "Create New Template"
- Template Name: `Email Verification`
- **Subject Line:**
  ```
  Verify Your Email - WhaTele Chat
  ```
- **Email Body (HTML):**
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
      .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🚀 WhaTele Chat</h1>
      </div>
      <div class="content">
        <h2>Welcome, {{to_name}}!</h2>
        <p>Thank you for registering with WhaTele Chat. To complete your registration, please verify your email address.</p>
        <p style="text-align: center;">
          <a href="{{verification_url}}" class="button">Verify Email Address</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: white; padding: 10px; border-radius: 4px;">{{verification_url}}</p>
        <p><strong>This link expires in 24 hours.</strong></p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>© 2024 WhaTele Chat. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  ```
- Click "Save"
- **Copy the Template ID** (e.g., `template_xyz789`)

#### 4. Get API Keys
- Click your profile icon (top right)
- Go to "Account"
- Scroll to "API Keys" section
- **Copy Public Key** (e.g., `abcdefghij`)
- **Copy Private Key** (click "eye" to reveal)

#### 5. Update .env
```env
EMAILJS_SERVICE_ID=service_abc123
EMAILJS_TEMPLATE_ID=template_xyz789
EMAILJS_PUBLIC_KEY=abcdefghij
EMAILJS_PRIVATE_KEY=your_private_key_here
```

#### 6. Test Email (Optional)
- In EmailJS dashboard, go to your template
- Click "Test It"
- Fill in test values
- Check your email inbox

---

## 7. Running the Application

### Step 7.1: Start Backend Server

**Open Terminal 1:**

```bash
# Make sure you're in the root directory
cd c:\Users\Tooni\Documents\Realtime-chat-app
# OR on Linux/macOS:
cd ~/Documents/Realtime-chat-app

# Start backend in development mode (auto-reload)
npm run dev
```

**Expected Output:**
```
[nodemon] starting `node server.js`
✅ MongoDB Connected: localhost
🚀 Server running on port 5000
📡 Socket.io server ready
🌍 Environment: development
```

**✅ Success Indicators:**
- No error messages
- MongoDB connection successful
- Server listening on port 5000
- Socket.io initialized

**❌ If you see errors, check:**
- MongoDB is running
- Port 5000 is not in use
- `.env` file exists and is configured
- All dependencies installed

### Step 7.2: Start Frontend Server

**Open Terminal 2 (keep Terminal 1 running):**

```bash
# Navigate to client directory
cd c:\Users\Tooni\Documents\Realtime-chat-app\client
# OR on Linux/macOS:
cd ~/Documents/Realtime-chat-app/client

# Start frontend development server
npm run dev
```

**Expected Output:**
```
  VITE v7.2.4  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**✅ Success Indicators:**
- Vite server started
- No compilation errors
- Local URL displayed

**💡 Pro Tip:** Keep both terminals open while developing!

---

## 8. Verification & Testing

### Step 8.1: Open the Application

1. **Open your browser** (Chrome, Firefox, Edge, Safari)
2. **Navigate to:** `http://localhost:5173`
3. You should see the **WhaTele Chat login page**

### Step 8.2: Register First Account

1. Click **"Sign Up"** or **"Register"**
2. Fill in the form:
   - **Username:** `testuser1`
   - **Email:** Your real email (you'll need to verify it)
   - **Password:** `Test123!` (or any secure password)
   - **Confirm Password:** Same as above
3. Click **"Register"**
4. You should see: **"Registration successful! Check your email to verify."**

### Step 8.3: Verify Email

1. **Check your email inbox** (the one you registered with)
2. Look for email from **WhaTele Chat**
3. **Click the verification link** in the email
4. You should be redirected and see: **"Email verified successfully!"**
5. You'll be automatically logged in

**⚠️ Didn't receive email?**
- Check spam/junk folder
- Wait 2-3 minutes (email can be delayed)
- Check EmailJS dashboard for errors
- Verify EmailJS credentials in `.env`

### Step 8.4: Test Core Features

#### Test 1: User Search
1. Click the **search icon** or **"New Chat"**
2. Search for users (you won't find any yet)
3. This confirms search is working

#### Test 2: Create Second Account
1. **Open incognito/private window** (or different browser)
2. Go to `http://localhost:5173`
3. Register another account:
   - Username: `testuser2`
   - Email: Different email
   - Password: `Test123!`
4. Verify email

#### Test 3: Start a Chat
1. In **first browser** (testuser1):
   - Search for `testuser2`
   - Click on the user
   - Send a message: "Hello!"
2. In **second browser** (testuser2):
   - You should see the message appear **instantly**
   - Reply: "Hi there!"
3. Check **both browsers** - messages should appear in real-time

#### Test 4: Image Upload
1. Click the **image icon** in message input
2. Select an image from your computer
3. Crop if desired
4. Click **"Send"**
5. Image should appear in chat (both sides)

#### Test 5: Group Chat
1. Click **"New Group"** or group icon
2. Name: `Test Group`
3. Add members: Select testuser2
4. Click **"Create"**
5. Send a message in the group
6. Check other browser - message should appear

#### Test 6: Typing Indicator
1. In one browser, start typing (don't send)
2. In other browser, you should see **"testuser1 is typing..."**
3. Stop typing - indicator should disappear

#### Test 7: Read Receipts
1. Send a message from testuser1
2. You should see **✓** (sent)
3. When testuser2 receives it: **✓✓** (delivered)
4. When testuser2 opens the chat: **✓✓** (blue/read)

#### Test 8: Online Status
1. Close browser for testuser2
2. In testuser1's browser, user should show **offline**
3. Reopen testuser2's browser
4. Should show **online** again

### ✅ All Tests Passed?

**Congratulations! 🎉 Your WhaTele Chat is fully functional!**

---

## 9. Common Issues

### Issue 1: Backend Won't Start

**Error:** `Error: Cannot find module 'express'`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: MongoDB Connection Failed

**Error:** `MongooseServerSelectionError`

**Solution:**
```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# macOS
brew services start mongodb-community

# Check if running
mongo --eval "db.version()"
```

### Issue 3: Port 5000 Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Windows - Find and kill process
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Linux/macOS
lsof -ti:5000 | xargs kill -9

# OR change port in .env
PORT=5001
```

### Issue 4: Frontend Can't Connect to Backend

**Error:** `Network Error` or `ERR_CONNECTION_REFUSED`

**Solution:**
1. Check backend is running (Terminal 1)
2. Verify `client/.env` has correct URLs:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```
3. Restart frontend:
   ```bash
   # In client directory
   npm run dev
   ```

### Issue 5: Email Not Sending

**Error:** Email verification not received

**Solution:**
1. Check spam/junk folder
2. Verify EmailJS credentials in `.env`
3. Test in EmailJS dashboard
4. Check EmailJS usage limits (200/month free)
5. Ensure template variables are correct:
   - `{{to_name}}`
   - `{{verification_url}}`

### Issue 6: Image Upload Fails

**Error:** `Error uploading image`

**Solution:**
1. Verify Cloudinary credentials in `.env`
2. Check file size (max 10MB on free tier)
3. Ensure file is image format (jpg, png, gif, webp)
4. Test upload in Cloudinary dashboard

### Issue 7: Messages Not Encrypting

**Error:** `Encryption failed` or plain text visible

**Solution:**
1. Clear browser data:
   - Open DevTools (F12)
   - Application tab → IndexedDB → Delete all
   - Local Storage → Clear
2. Re-register account
3. Check browser supports Web Crypto API (all modern browsers do)

### Issue 8: Socket.io Not Connecting

**Error:** `WebSocket connection failed`

**Solution:**
1. Check backend console for Socket.io errors
2. Verify `FRONTEND_URL` in backend `.env`:
   ```env
   FRONTEND_URL=http://localhost:5173
   ```
3. Check CORS settings in `server.js`
4. Restart both servers

### Still Having Issues?

1. **Check logs:** Look at both terminal outputs for errors
2. **Browser console:** Press F12 and check Console tab
3. **Network tab:** Check if API calls are succeeding
4. **Read full README:** See [README.md](./README.md) for detailed troubleshooting
5. **Create an issue:** Include error messages, logs, and steps to reproduce

---

## 10. Next Steps

### 🎓 Learn the Codebase

1. **Explore the code:**
   - Backend: `server.js`, `routes/`, `models/`, `sockets/`
   - Frontend: `client/src/`, `components/`, `pages/`
2. **Read documentation:**
   - [API.md](./API.md) - API endpoints
   - [SOCKET_EVENTS.md](./SOCKET_EVENTS.md) - Real-time events
   - [README.md](./README.md) - Complete documentation

### 🛠️ Customize Your App

1. **Change branding:**
   - Update app name in `client/index.html`
   - Replace logo in `client/public/`
   - Modify colors in `client/src/index.css`
2. **Add features:**
   - Voice messages
   - Video messages
   - Message reactions
   - User blocking
   - Message search

### 🚀 Deploy to Production

1. **Backend deployment:**
   - Heroku, Railway, Render, or AWS
   - See [README.md - Deployment](./README.md#-deployment)
2. **Frontend deployment:**
   - Vercel, Netlify, or Cloudflare Pages
3. **Update environment variables** for production
4. **Enable HTTPS** (required for WebRTC)
5. **Set up domain** and SSL certificate

### 📊 Monitor & Optimize

1. **Add analytics:**
   - Google Analytics
   - Mixpanel
   - PostHog
2. **Monitor errors:**
   - Sentry
   - LogRocket
3. **Optimize performance:**
   - Enable caching
   - Compress images
   - Use CDN

### 👥 Invite Users

1. Share your app with friends
2. Get feedback
3. Iterate and improve
4. Build a community!

---

## 🎉 Congratulations!

You've successfully set up **WhaTele Chat**! 🎊

**What you've accomplished:**
- ✅ Installed all dependencies
- ✅ Configured backend and frontend
- ✅ Set up database (MongoDB)
- ✅ Configured external services (Cloudinary, EmailJS)
- ✅ Started both servers
- ✅ Tested core features
- ✅ Built a production-ready chat app!

**You now have:**
- 💬 Real-time messaging
- 🔐 End-to-end encryption
- 👥 Group chats
- 📷 Image sharing
- 📞 Voice/video calls
- ✓✓ Read receipts
- 🟢 Online presence
- And much more!

**Need help?**
- 📚 Read the [full README](./README.md)
- 🐛 Check [Troubleshooting](#9-common-issues)
- 💬 Create an issue on GitHub
- ⭐ Star the repo if you found it helpful!

**Happy chatting! 🚀💬**
