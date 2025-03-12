import type { Express, Request } from "express";
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
  insertCommentSchema
} from "@shared/schema";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { log } from "./vite";
import WebSocket, { WebSocketServer } from "ws";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, "audio"), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, "images"), { recursive: true });
}

// Configure multer storage
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    const fileType = file.mimetype.startsWith('audio/') ? 'audio' : 'images';
    cb(null, path.join(uploadsDir, fileType));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Create multer upload middleware
const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow audio and images
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth routes with Passport
  setupAuth(app);
  
  // API routes
  
  // Users
  app.get("/api/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't expose password in API response
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  app.get("/api/users/by-username/:username", async (req, res) => {
    const username = req.params.username;
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't expose password in API response
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // Don't expose password in API response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  // Streams
  app.get("/api/streams/featured", async (req, res) => {
    const streams = await storage.getFeaturedStreams();
    res.json(streams);
  });
  
  app.get("/api/streams/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid stream ID" });
    }
    
    const stream = await storage.getStream(id);
    
    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
    }
    
    res.json(stream);
  });
  
  app.get("/api/streams/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const streams = await storage.getStreamsByUser(userId);
    res.json(streams);
  });
  
  app.post("/api/streams", async (req, res) => {
    try {
      const streamData = insertStreamSchema.parse(req.body);
      const stream = await storage.createStream(streamData);
      res.status(201).json(stream);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid stream data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating stream" });
    }
  });
  
  // Tracks
  app.get("/api/tracks/recent", async (req, res) => {
    const tracks = await storage.getRecentTracks();
    res.json(tracks);
  });
  
  app.get("/api/tracks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid track ID" });
    }
    
    const track = await storage.getTrack(id);
    
    if (!track) {
      return res.status(404).json({ message: "Track not found" });
    }
    
    res.json(track);
  });
  
  app.get("/api/tracks/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const tracks = await storage.getTracksByUser(userId);
    res.json(tracks);
  });
  
  // Upload endpoints for files
  app.post("/api/upload/audio", upload.single("audio"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }
      
      // Return the file path for client to use when creating tracks
      const fileUrl = `/uploads/audio/${req.file.filename}`;
      
      // Get audio duration (in a real app, we would use a library to get this)
      // For now we'll use a mock duration
      const duration = 180; // 3 minutes in seconds
      
      res.status(201).json({ 
        url: fileUrl, 
        originalName: req.file.originalname,
        size: req.file.size,
        duration: duration
      });
    } catch (error) {
      console.error("Audio upload error:", error);
      res.status(500).json({ message: "Error uploading audio file" });
    }
  });
  
  app.post("/api/upload/image", upload.single("image"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Return the file path for client to use
      const fileUrl = `/uploads/images/${req.file.filename}`;
      
      res.status(201).json({ 
        url: fileUrl, 
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Error uploading image file" });
    }
  });
  
  // Track creation endpoint
  app.post("/api/tracks", async (req, res) => {
    try {
      const trackData = insertTrackSchema.parse(req.body);
      const track = await storage.createTrack(trackData);
      res.status(201).json(track);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid track data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating track" });
    }
  });
  
  // Genres
  app.get("/api/genres", async (req, res) => {
    const genres = await storage.getGenres();
    res.json(genres);
  });
  
  // Follows
  app.get("/api/channels/followed", async (req, res) => {
    // In a real app, this would get followed channels for the current user
    // For now, return all users as example channels
    const users = await storage.getAllUsers();
    res.json(users);
  });
  
  app.post("/api/follows", async (req, res) => {
    try {
      const followData = insertFollowSchema.parse(req.body);
      const follow = await storage.createFollow(followData);
      
      // Increment follower count
      await storage.incrementFollowerCount(followData.followedId);
      
      res.status(201).json(follow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid follow data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating follow" });
    }
  });
  
  app.get("/api/follows/check", async (req, res) => {
    try {
      const { followerId, followedId } = req.query;
      
      if (!followerId || !followedId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      const isFollowing = await storage.isFollowing(
        parseInt(followerId as string), 
        parseInt(followedId as string)
      );
      
      res.status(200).json({ isFollowing });
    } catch (error) {
      res.status(500).json({ message: "Error checking follow status" });
    }
  });
  
  app.get("/api/follows/followers/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const followers = await storage.getFollowers(userId);
      res.status(200).json(followers);
    } catch (error) {
      res.status(500).json({ message: "Error getting followers" });
    }
  });
  
  app.get("/api/follows/following/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const following = await storage.getFollowing(userId);
      res.status(200).json(following);
    } catch (error) {
      res.status(500).json({ message: "Error getting following users" });
    }
  });
  
  app.delete("/api/follows/:userId", async (req, res) => {
    const followedId = parseInt(req.params.userId);
    if (isNaN(followedId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    // For simplicity, we'll just use a mock followerId 
    const followerId = 999; // In a real app, this would be the current user's ID
    
    await storage.removeFollow(followerId, followedId);
    
    // Decrement follower count
    await storage.decrementFollowerCount(followedId);
    
    res.status(204).send();
  });
  
  // Likes endpoints
  app.post("/api/likes", async (req, res) => {
    try {
      const likeData = insertLikeSchema.parse(req.body);
      const like = await storage.createLike(likeData);
      res.status(201).json(like);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid like data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating like" });
    }
  });
  
  app.delete("/api/likes", async (req, res) => {
    try {
      const { userId, contentId, contentType } = req.body;
      
      if (!userId || !contentId || !contentType) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      await storage.removeLike(userId, contentId, contentType);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error removing like" });
    }
  });
  
  app.get("/api/likes/check", async (req, res) => {
    try {
      const { userId, contentId, contentType } = req.query;
      
      if (!userId || !contentId || !contentType) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const isLiked = await storage.isLiked(
        parseInt(userId as string), 
        parseInt(contentId as string), 
        contentType as string
      );
      
      res.status(200).json({ isLiked });
    } catch (error) {
      res.status(500).json({ message: "Error checking like status" });
    }
  });
  
  app.get("/api/likes/count/:contentType/:contentId", async (req, res) => {
    try {
      const { contentType, contentId } = req.params;
      const count = await storage.getLikeCount(parseInt(contentId), contentType);
      res.status(200).json({ count });
    } catch (error) {
      res.status(500).json({ message: "Error getting like count" });
    }
  });
  
  app.get("/api/likes/user/:userId/:contentType", async (req, res) => {
    try {
      const { userId, contentType } = req.params;
      const likedContentIds = await storage.getUserLikes(parseInt(userId), contentType);
      res.status(200).json(likedContentIds);
    } catch (error) {
      res.status(500).json({ message: "Error getting user likes" });
    }
  });
  
  // Comments endpoints
  app.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating comment" });
    }
  });
  
  app.put("/api/comments/:commentId", async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const { text } = req.body;
      
      if (isNaN(commentId) || !text) {
        return res.status(400).json({ message: "Invalid comment data" });
      }
      
      const updatedComment = await storage.updateComment(commentId, text);
      
      if (!updatedComment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.status(200).json(updatedComment);
    } catch (error) {
      res.status(500).json({ message: "Error updating comment" });
    }
  });
  
  app.delete("/api/comments/:commentId", async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "Invalid comment ID" });
      }
      
      await storage.deleteComment(commentId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting comment" });
    }
  });
  
  app.get("/api/comments/:contentType/:contentId", async (req, res) => {
    try {
      const { contentType, contentId } = req.params;
      const comments = await storage.getCommentsByContent(parseInt(contentId), contentType);
      res.status(200).json(comments);
    } catch (error) {
      res.status(500).json({ message: "Error getting comments" });
    }
  });
  
  app.get("/api/comments/replies/:commentId", async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "Invalid comment ID" });
      }
      
      const replies = await storage.getReplies(commentId);
      res.status(200).json(replies);
    } catch (error) {
      res.status(500).json({ message: "Error getting comment replies" });
    }
  });
  
  // User Settings
  app.get("/api/user-settings/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const settings = await storage.getUserSettings(userId);
    if (!settings) {
      // If no settings exist, create default ones
      const defaultSettings = await storage.createUserSettings({
        userId,
        uiColor: "#8B5CF6",
        enableAutoplay: true,
        defaultSortType: "recent"
      });
      return res.json(defaultSettings);
    }
    
    res.json(settings);
  });
  
  app.post("/api/user-settings", async (req, res) => {
    try {
      const settingsData = insertUserSettingsSchema.parse(req.body);
      const settings = await storage.createUserSettings(settingsData);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user settings" });
    }
  });
  
  app.patch("/api/user-settings/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    try {
      const settingsData = req.body;
      const settings = await storage.updateUserSettings(userId, settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating user settings" });
    }
  });
  
  // Posts
  app.get("/api/posts/recent", async (req, res) => {
    const posts = await storage.getRecentPosts();
    res.json(posts);
  });
  
  app.get("/api/posts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    const post = await storage.getPost(id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    res.json(post);
  });
  
  app.get("/api/posts/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const posts = await storage.getPostsByUser(userId);
    res.json(posts);
  });
  
  app.post("/api/posts", async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating post" });
    }
  });
  
  // Creators
  app.get("/api/creators/recommended", async (req, res) => {
    const creators = await storage.getRecommendedCreators();
    res.json(creators);
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Types for WebSocket messages
  type ChatMessage = {
    id: number;
    userId: number;
    username: string;
    message: string;
    timestamp: Date;
  };
  
  type ClientMessage = {
    type: 'chat' | 'join' | 'leave';
    streamId: number;
    userId?: number;
    username?: string;
    message?: string;
  };
  
  type ServerMessage = {
    type: 'chat_message' | 'user_joined' | 'user_left' | 'stream_status' | 'viewer_count' | 'chat_history';
    streamId: number;
    userId?: number;
    username?: string;
    message?: string;
    messages?: ChatMessage[];
    viewerCount?: number;
    timestamp?: Date;
    isLive?: boolean;
  };
  
  // Keep track of active streams and their connections
  const streamConnections = new Map<number, Set<WebSocket>>();
  const streamMessages = new Map<number, ChatMessage[]>();
  
  wss.on('connection', (ws, req) => {
    log('New WebSocket connection established', 'websocket');
    
    // Parse URL to get parameters
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const streamId = parseInt(url.searchParams.get('streamId') || '0');
    const userId = parseInt(url.searchParams.get('userId') || '0');
    const username = url.searchParams.get('username') || 'Anonymous';
    
    if (streamId <= 0) {
      ws.close(1008, 'Invalid stream ID');
      return;
    }
    
    // Add this client to the stream's connections
    if (!streamConnections.has(streamId)) {
      streamConnections.set(streamId, new Set());
      streamMessages.set(streamId, []);
    }
    
    const connections = streamConnections.get(streamId);
    if (connections) {
      connections.add(ws);
      
      // Update viewer count
      const viewerCount = connections.size;
      storage.updateStreamViewerCount(streamId, viewerCount);
      
      // Send existing chat history
      const messages = streamMessages.get(streamId) || [];
      ws.send(JSON.stringify({
        type: 'chat_history',
        streamId,
        messages
      }));
      
      // Send current viewer count to all clients
      connections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'viewer_count',
            streamId,
            viewerCount,
            timestamp: new Date()
          }));
        }
      });
      
      // Broadcast user joined message
      if (userId > 0) {
        const joinMessage: ChatMessage = {
          id: Date.now(),
          userId,
          username,
          message: `${username} joined the stream`,
          timestamp: new Date()
        };
        
        messages.push(joinMessage);
        
        connections.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'user_joined',
              streamId,
              userId,
              username,
              timestamp: new Date()
            }));
          }
        });
      }
    }
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data: ClientMessage = JSON.parse(message.toString());
        const connections = streamConnections.get(data.streamId);
        const messages = streamMessages.get(data.streamId) || [];
        
        if (!connections) return;
        
        if (data.type === 'chat' && data.message) {
          // Create chat message
          const chatMessage: ChatMessage = {
            id: Date.now(),
            userId: data.userId || 0,
            username: data.username || 'Anonymous',
            message: data.message,
            timestamp: new Date()
          };
          
          // Add to message history
          messages.push(chatMessage);
          
          // Limit history to prevent memory issues
          if (messages.length > 100) {
            messages.splice(0, messages.length - 100);
          }
          
          // Broadcast to all clients
          connections.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'chat_message',
                streamId: data.streamId,
                message: chatMessage
              }));
            }
          });
        }
      } catch (error) {
        log(`Error processing WebSocket message: ${error}`, 'websocket');
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      const connections = streamConnections.get(streamId);
      
      if (connections) {
        // Remove this client
        connections.delete(ws);
        
        // Update viewer count
        const viewerCount = connections.size;
        storage.updateStreamViewerCount(streamId, viewerCount);
        
        // Broadcast updated viewer count
        connections.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'viewer_count',
              streamId,
              viewerCount,
              timestamp: new Date()
            }));
          }
        });
        
        // Broadcast user left message
        if (userId > 0) {
          connections.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'user_left',
                streamId,
                userId,
                username,
                timestamp: new Date()
              }));
            }
          });
        }
        
        // Clean up empty stream connections
        if (connections.size === 0) {
          streamConnections.delete(streamId);
          streamMessages.delete(streamId);
        }
      }
    });
  });
  
  // Add endpoint to end a stream
  app.post("/api/streams/:id/end", async (req, res) => {
    const streamId = parseInt(req.params.id);
    if (isNaN(streamId)) {
      return res.status(400).json({ message: "Invalid stream ID" });
    }
    
    const stream = await storage.getStream(streamId);
    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
    }
    
    // Update stream state to not live
    await storage.updateStream(streamId, { isLive: false });
    
    // Notify all connected clients
    const connections = streamConnections.get(streamId);
    if (connections) {
      connections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'stream_status',
            streamId,
            isLive: false,
            timestamp: new Date()
          }));
        }
      });
    }
    
    // Clean up resources
    streamConnections.delete(streamId);
    streamMessages.delete(streamId);
    
    res.json({ success: true });
  });

  return httpServer;
}
