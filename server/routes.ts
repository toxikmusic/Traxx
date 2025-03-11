import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertStreamSchema, insertTrackSchema, insertFollowSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
  
  // Creators
  app.get("/api/creators/recommended", async (req, res) => {
    const creators = await storage.getRecommendedCreators();
    res.json(creators);
  });

  const httpServer = createServer(app);

  return httpServer;
}
