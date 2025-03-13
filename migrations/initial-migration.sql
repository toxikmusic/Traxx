-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  profile_image_url TEXT,
  is_streaming BOOLEAN DEFAULT FALSE,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  ui_color TEXT DEFAULT '#8B5CF6',
  enable_autoplay BOOLEAN DEFAULT TRUE,
  default_sort_type TEXT DEFAULT 'recent',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create streams table
CREATE TABLE IF NOT EXISTS streams (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_live BOOLEAN DEFAULT FALSE,
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  category TEXT,
  tags TEXT[]
);

-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  cover_url TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  genre TEXT
);

-- Create genres table
CREATE TABLE IF NOT EXISTS genres (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL,
  followed_id INTEGER NOT NULL
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  post_type TEXT DEFAULT 'text',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tags TEXT[]
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  like_count INTEGER DEFAULT 0,
  parent_id INTEGER
);

-- Add common genres
INSERT INTO genres (name) VALUES 
  ('Electronic'), ('Hip Hop'), ('Lo-Fi'), ('House'), 
  ('Indie'), ('Techno'), ('Trap'), ('Ambient'), 
  ('Jazz'), ('R&B')
ON CONFLICT (name) DO NOTHING;

-- Create sessions table for express-session with PostgreSQL
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");