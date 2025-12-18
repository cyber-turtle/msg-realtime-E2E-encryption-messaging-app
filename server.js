require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

// Import error handler
const errorHandler = require('./middleware/error');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'WhaTele Chat API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler (must be last)
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || process.env.MONGO_URL;
  
  if (!mongoURI) {
    console.error('❌ FATAL ERROR: No MongoDB URI found in environment variables.');
    console.error('Please add MONGO_URI or MONGO_URL to your Railway Project Variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(` ✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(` ❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Import and initialize Socket.io handlers
const initializeSocket = require('./sockets/index');
initializeSocket(io);

// Make io accessible to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
    console.log(` Socket.io server ready`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(` Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
