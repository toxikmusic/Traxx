import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertStreamSchema, 
  insertTrackSchema, 
  insertFollowSchema, 
  insertUserSettingsSchema,
  insertPostSchema,
  insertLikeSchema,
  insertCommentSchema,
  PostType,
  type PostTypeValues,
  type InsertUser
} from "@shared/schema";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { checkCloudflareService } from './services/cloudflare';
import { log } from "./vite";
import { Server as SocketIOServer } from "socket.io";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "./db";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_ = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function(req, file, cb) {
    // Use original filename with timestamp to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueSuffix + ext)
  }
});

const upload = multer({ 
  storage: storage_,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Helper function to generate a secure stream key
function generateStreamKey(): string {
  return crypto.randomBytes(24).toString('hex');
}

// Initialize WebSocket and Socket.IO
let io: SocketIOServer;

// Setup for chat/stream messages
const streamConnections = new Map<number, Set<WebSocket>>();
const streamMessages = new Map<number, any[]>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);
  
  // Initialize Socket.IO for streaming
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Allow all origins, customize this in production
      methods: ["GET", "POST"]
    }
  });
  
  // Handle authentication for APIs (using passport.js)
  setupAuth(app);

  // Initialize WebSocket server for chat
  const wss = new WebSocketServer({ noServer: true });
  
  // Define a separate WebSocket server for audio streaming
  const audioStreamingWss = new WebSocketServer({ noServer: true });
  
  // Define Socket.IO namespace for chat/stream functionality
  const streamIo = io.of('/stream');
  
  streamIo.on('connection', (socket) => {
    log('New Socket.IO connection established', 'websocket');

    // Get connection parameters from handshake query or auth
    const query = socket.handshake.query;
    const streamId = parseInt(query.streamId as string || '0');
    const userId = parseInt(query.userId as string || '0');
    const username = query.username as string || 'Anonymous';
    const role = query.role as string || 'listener';
    const streamKey = query.streamKey as string || '';

    if (streamId <= 0) {
      socket.disconnect();
      return;
    }

    // Join a room specific to this stream
    socket.join(`stream:${streamId}`);
    
    // Set up Socket.IO specific handling for audio streaming
    if (role === 'broadcaster') {
      // Handle broadcaster connection
      log(`Broadcaster connected to stream ${streamId}`, 'websocket');
      
      // Verify stream key if provided
      if (streamKey) {
        storage.getStream(streamId).then(stream => {
          if (!stream) {
            log(`Stream ${streamId} not found`, 'websocket');
            socket.emit('error', { message: 'Stream not found' });
            socket.disconnect();
            return;
          }
          
          if (stream.streamKey !== streamKey) {
            log(`Invalid stream key for stream ${streamId}`, 'websocket');
            socket.emit('error', { message: 'Invalid stream key' });
            socket.disconnect();
            return;
          }
          
          log(`Broadcaster authenticated for stream ${streamId}`, 'websocket');
          
          // Mark the stream as live in the database
          storage.updateStream(streamId, { isLive: true });
          
          // Announce the stream is live to all clients in this stream's room
          streamIo.to(`stream:${streamId}`).emit('stream_status', {
            type: 'stream_status',
            streamId,
            isLive: true,
            viewerCount: streamIo.adapter.rooms.get(`stream:${streamId}`)?.size || 1
          });
        }).catch(error => {
          log(`Error authenticating stream: ${error}`, 'websocket');
          socket.emit('error', { message: 'Authentication error' });
          socket.disconnect();
        });
      }
      
      // Handle audio data from broadcaster
      socket.on('audio_data', (data) => {
        // Forward audio data to all listeners in this stream
        socket.to(`stream:${streamId}`).emit('audio_data', data);
      });
      
      // Handle audio level updates
      socket.on('audio_level', (data) => {
        // Forward audio level to all listeners
        socket.to(`stream:${streamId}`).emit('audio_level', data);
      });
      
      // Handle ping/heartbeat
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        log(`Broadcaster disconnected from stream ${streamId}`, 'websocket');
        
        // Mark the stream as offline in the database
        storage.updateStream(streamId, { isLive: false }).catch(err => {
          log(`Error updating stream status: ${err}`, 'websocket');
        });
        
        // Notify all clients that the stream has ended
        streamIo.to(`stream:${streamId}`).emit('stream_status', {
          type: 'stream_status',
          streamId,
          isLive: false
        });
      });
    } else {
      // Handle listener connection
      log(`Listener connected to stream ${streamId}`, 'websocket');
      
      // Update viewer count for this stream
      const viewerCount = streamIo.adapter.rooms.get(`stream:${streamId}`)?.size || 1;
      storage.updateStreamViewerCount(streamId, viewerCount);
      
      // Notify all clients about the updated viewer count
      streamIo.to(`stream:${streamId}`).emit('viewer_count', {
        type: 'viewer_count',
        streamId,
        viewerCount
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        log(`Listener disconnected from stream ${streamId}`, 'websocket');
        
        // Update viewer count
        const updatedViewerCount = streamIo.adapter.rooms.get(`stream:${streamId}`)?.size || 0;
        storage.updateStreamViewerCount(streamId, updatedViewerCount);
        
        // Notify all clients about the updated viewer count
        streamIo.to(`stream:${streamId}`).emit('viewer_count', {
          type: 'viewer_count',
          streamId,
          viewerCount: updatedViewerCount
        });
      });
    }
  });

  // Map to track audio streaming connections for each stream
  const audioStreamConnections = new Map<number, { broadcaster: WebSocket | null, listeners: Set<WebSocket> }>();

  // Handle HTTP->WebSocket upgrade for the chat
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;

    // Route to appropriate WebSocket server based on path
    if (pathname === '/ws/chat') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/audio') {
      audioStreamingWss.handleUpgrade(request, socket, head, (ws) => {
        audioStreamingWss.emit('connection', ws, request);
      });
    } else {
      // Unhandled WebSocket upgrade path
      socket.destroy();
    }
  });

  // Add some basic API endpoints
  app.get("/api/streams", async (req, res) => {
    try {
      // Use the proper API based on what's available in storage
      // For now, we'll return an empty array if not implemented
      const streams = await Promise.resolve([]);
      res.json(streams);
    } catch (error) {
      console.error("Error fetching streams:", error);
      res.status(500).json({ message: "Failed to fetch streams" });
    }
  });

  // Get featured streams
  app.get("/api/streams/featured", async (req, res) => {
    try {
      const featuredStreams = await storage.getFeaturedStreams();
      res.json(featuredStreams);
    } catch (error) {
      console.error("Error fetching featured streams:", error);
      res.status(500).json({ message: "Failed to fetch featured streams" });
    }
  });
  
  // Get streams by user
  app.get("/api/streams/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const userStreams = await storage.getStreamsByUser(userId);
      res.json(userStreams);
    } catch (error) {
      console.error("Error fetching user streams:", error);
      res.status(500).json({ message: "Failed to fetch user streams" });
    }
  });

  app.get("/api/streams/:id", async (req, res) => {
    const streamId = parseInt(req.params.id);
    if (isNaN(streamId)) {
      return res.status(400).json({ message: "Invalid stream ID" });
    }

    const stream = await storage.getStream(streamId);
    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
    }

    res.json(stream);
  });

  app.post("/api/streams", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate request body
    const streamSchema = insertStreamSchema.extend({
      title: z.string().min(3).max(100),
      description: z.string().max(2000).optional(),
    });

    try {
      const validatedData = streamSchema.parse(req.body);
      
      // Generate a secure stream key
      const streamKey = generateStreamKey();
      
      // Create stream with the current user
      const newStream = await storage.createStream({
        ...validatedData,
        userId: req.user.id,
        streamKey
        // Other properties like isLive and viewerCount are handled by the storage implementation
      });
      
      // Return the stream with the key (only shown once)
      res.status(201).json({
        ...newStream,
        streamKey
      });
    } catch (error) {
      console.error("Error creating stream:", error);
      res.status(400).json({ message: "Invalid stream data", error });
    }
  });

  // Get recent tracks
  app.get("/api/tracks/recent", async (req, res) => {
    try {
      const recentTracks = await storage.getRecentTracks();
      res.json(recentTracks);
    } catch (error) {
      console.error("Error fetching recent tracks:", error);
      res.status(500).json({ message: "Failed to fetch recent tracks" });
    }
  });

  // Get tracks by user
  app.get("/api/tracks/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const userTracks = await storage.getTracksByUser(userId);
      res.json(userTracks);
    } catch (error) {
      console.error("Error fetching user tracks:", error);
      res.status(500).json({ message: "Failed to fetch user tracks" });
    }
  });

  // Get a specific track
  app.get("/api/tracks/:id", async (req, res) => {
    try {
      const trackId = parseInt(req.params.id);
      if (isNaN(trackId)) {
        return res.status(400).json({ message: "Invalid track ID" });
      }
      
      const track = await storage.getTrack(trackId);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      
      res.json(track);
    } catch (error) {
      console.error("Error fetching track:", error);
      res.status(500).json({ message: "Failed to fetch track" });
    }
  });

  // Get recommended creators
  app.get("/api/creators/recommended", async (req, res) => {
    try {
      const recommendedCreators = await storage.getRecommendedCreators();
      res.json(recommendedCreators);
    } catch (error) {
      console.error("Error fetching recommended creators:", error);
      res.status(500).json({ message: "Failed to fetch recommended creators" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send back sensitive information like password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Get user by username
  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const username = req.params.username;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send back sensitive information like password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user by username:", error);
      res.status(500).json({ message: "Failed to fetch user by username" });
    }
  });

  // Get user settings
  app.get("/api/user-settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const settings = await storage.getUserSettings(userId);
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = await storage.createUserSettings({
          userId,
          uiColor: "#8B5CF6",
          enableAutoplay: true,
          defaultSortType: "recent",
          highContrastMode: false
        });
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  // Get posts by user
  app.get("/api/posts/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const userPosts = await storage.getPostsByUser(userId);
      res.json(userPosts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  // Check if user has liked content
  app.get("/api/likes/check", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const contentId = parseInt(req.query.contentId as string);
      const contentType = req.query.contentType as string;
      
      if (isNaN(userId) || isNaN(contentId) || !contentType) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      const isLiked = await storage.isLiked(userId, contentId, contentType);
      res.json({ isLiked });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ message: "Failed to check like status" });
    }
  });
  
  // Get like count for content
  app.get("/api/likes/count/:contentType/:contentId", async (req, res) => {
    try {
      const contentId = parseInt(req.params.contentId);
      const contentType = req.params.contentType;
      
      if (isNaN(contentId) || !contentType) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      const likeCount = await storage.getLikeCount(contentId, contentType);
      res.json({ likeCount });
    } catch (error) {
      console.error("Error fetching like count:", error);
      res.status(500).json({ message: "Failed to fetch like count" });
    }
  });
  
  // Create like
  app.post("/api/likes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const likeData = {
        userId: req.user.id,
        contentId: req.body.contentId,
        contentType: req.body.contentType
      };
      
      const like = await storage.createLike(likeData);
      res.status(201).json(like);
    } catch (error) {
      console.error("Error creating like:", error);
      res.status(500).json({ message: "Failed to create like" });
    }
  });
  
  // Remove like
  app.delete("/api/likes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = req.user.id;
      const contentId = parseInt(req.query.contentId as string);
      const contentType = req.query.contentType as string;
      
      if (isNaN(contentId) || !contentType) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      await storage.removeLike(userId, contentId, contentType);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing like:", error);
      res.status(500).json({ message: "Failed to remove like" });
    }
  });
  
  // End a stream
  app.post("/api/streams/:id/end", async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      if (isNaN(streamId)) {
        return res.status(400).json({ message: "Invalid stream ID" });
      }
      
      // Get the stream
      const stream = await storage.getStream(streamId);
      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }
      
      // Check authorization (only stream owner can end it)
      if (req.isAuthenticated() && req.user.id !== stream.userId) {
        return res.status(403).json({ message: "Not authorized to end this stream" });
      }
      
      // Mark the stream as not live and set the end time
      const updatedStream = await storage.updateStream(streamId, { 
        isLive: false,
        endedAt: new Date()
      });
      
      res.json(updatedStream);
    } catch (error) {
      console.error("Error ending stream:", error);
      res.status(500).json({ message: "Failed to end stream" });
    }
  });
  
  // Delete a stream
  app.delete("/api/streams/:id", async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      if (isNaN(streamId)) {
        return res.status(400).json({ message: "Invalid stream ID" });
      }
      
      // Get the stream
      const stream = await storage.getStream(streamId);
      if (!stream) {
        return res.status(404).json({ message: "Stream not found" });
      }
      
      // Check authorization (only stream owner can delete it)
      if (req.isAuthenticated() && req.user.id !== stream.userId) {
        return res.status(403).json({ message: "Not authorized to delete this stream" });
      }
      
      // Delete the stream
      await storage.deleteStream(streamId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting stream:", error);
      res.status(500).json({ message: "Failed to delete stream" });
    }
  });

  return server;
}