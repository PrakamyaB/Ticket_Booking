import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.routes';
import venueRoutes from './routes/venue.routes';
import eventRoutes from './routes/event.routes';
import bookingRoutes from './routes/booking.routes';
import emailRoutes from './routes/email.routes';

import { startHoldCleanupScheduler, setSocketIoInstance } from './services/hold-cleanup.service';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development server
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

const httpServer = createServer(app);

// Configure Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set socket instance on app for controller broadcasts
app.set('io', io);
setSocketIoInstance(io);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Customer joins event room to receive live seat updates
  socket.on('join-event', (eventId: string) => {
    socket.join(`event_${eventId}`);
    console.log(`Socket ${socket.id} joined event room: event_${eventId}`);
  });

  socket.on('leave-event', (eventId: string) => {
    socket.leave(`event_${eventId}`);
    console.log(`Socket ${socket.id} left event room: event_${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

import path from 'path';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/emails', emailRoutes);

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', time: new Date() });
});

// Serve compiled React frontend assets in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start scheduler background loop
startHoldCleanupScheduler();

// Start Server
httpServer.listen(PORT, () => {
  console.log(`Backend Server listening on port ${PORT}`);
});
