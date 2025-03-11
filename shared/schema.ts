import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  isStreaming: boolean("is_streaming").default(false),
  followerCount: integer("follower_count").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  bio: true,
  profileImageUrl: true
});

// Stream model
export const streams = pgTable("streams", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  isLive: boolean("is_live").default(false),
  viewerCount: integer("viewer_count").default(0),
  startedAt: timestamp("started_at").defaultNow(),
  category: text("category"),
  tags: text("tags").array()
});

export const insertStreamSchema = createInsertSchema(streams).pick({
  userId: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  category: true,
  tags: true
});

// Track model
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  artistName: text("artist_name").notNull(),
  coverUrl: text("cover_url"),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration").notNull(),
  playCount: integer("play_count").default(0),
  likeCount: integer("like_count").default(0),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  genre: text("genre")
});

export const insertTrackSchema = createInsertSchema(tracks).pick({
  userId: true,
  title: true,
  artistName: true,
  coverUrl: true,
  audioUrl: true,
  duration: true,
  genre: true
});

// Genre model
export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique()
});

export const insertGenreSchema = createInsertSchema(genres).pick({
  name: true
});

// Follow model (for user following relationships)
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull(),
  followedId: integer("followed_id").notNull()
});

export const insertFollowSchema = createInsertSchema(follows).pick({
  followerId: true,
  followedId: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Stream = typeof streams.$inferSelect;
export type InsertStream = z.infer<typeof insertStreamSchema>;

export type Track = typeof tracks.$inferSelect;
export type InsertTrack = z.infer<typeof insertTrackSchema>;

export type Genre = typeof genres.$inferSelect;
export type InsertGenre = z.infer<typeof insertGenreSchema>;

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
