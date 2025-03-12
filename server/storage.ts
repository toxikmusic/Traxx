import { 
  users,
  streams,
  tracks,
  genres,
  follows,
  userSettings,
  posts,
  likes,
  comments,
  PostType,
  type PostTypeValues,
  type User,
  type InsertUser,
  type Stream,
  type InsertStream,
  type Track,
  type InsertTrack,
  type Genre,
  type InsertGenre,
  type Follow,
  type InsertFollow,
  type UserSettings,
  type InsertUserSettings,
  type Post,
  type InsertPost,
  type Like,
  type InsertLike,
  type Comment,
  type InsertComment
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  incrementFollowerCount(userId: number): Promise<void>;
  decrementFollowerCount(userId: number): Promise<void>;
  
  // User Settings
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  // Streams
  getStream(id: number): Promise<Stream | undefined>;
  getFeaturedStreams(): Promise<Stream[]>;
  getStreamsByUser(userId: number): Promise<Stream[]>;
  createStream(stream: InsertStream): Promise<Stream>;
  updateStream(id: number, data: Partial<Stream>): Promise<Stream | undefined>;
  updateStreamViewerCount(id: number, count: number): Promise<void>;
  
  // Tracks
  getTrack(id: number): Promise<Track | undefined>;
  getRecentTracks(): Promise<Track[]>;
  getTracksByUser(userId: number): Promise<Track[]>;
  createTrack(track: InsertTrack): Promise<Track>;
  incrementTrackPlayCount(trackId: number): Promise<void>;
  
  // Posts
  getPost(id: number): Promise<Post | undefined>;
  getRecentPosts(): Promise<Post[]>;
  getPostsByUser(userId: number): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  
  // Genres
  getGenres(): Promise<Genre[]>;
  createGenre(genre: InsertGenre): Promise<Genre>;
  
  // Follows
  createFollow(follow: InsertFollow): Promise<Follow>;
  removeFollow(followerId: number, followedId: number): Promise<void>;
  isFollowing(followerId: number, followedId: number): Promise<boolean>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  
  // Likes
  createLike(like: InsertLike): Promise<Like>;
  removeLike(userId: number, contentId: number, contentType: string): Promise<void>;
  isLiked(userId: number, contentId: number, contentType: string): Promise<boolean>;
  getLikeCount(contentId: number, contentType: string): Promise<number>;
  getUserLikes(userId: number, contentType: string): Promise<number[]>; // Returns content IDs
  
  // Comments
  getComment(id: number): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, text: string): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<void>;
  getCommentsByContent(contentId: number, contentType: string): Promise<Comment[]>;
  getReplies(commentId: number): Promise<Comment[]>;
  
  // Creators
  getRecommendedCreators(): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private userSettings: Map<number, UserSettings>;
  private streams: Map<number, Stream>;
  private tracks: Map<number, Track>;
  private posts: Map<number, Post>;
  private genres: Map<number, Genre>;
  private follows: Map<number, Follow>;
  private likes: Map<number, Like>;
  private comments: Map<number, Comment>;
  
  private userId: number;
  private userSettingsId: number;
  private streamId: number;
  private trackId: number;
  private postId: number;
  private genreId: number;
  private followId: number;
  private likeId: number;
  private commentId: number;
  
  // Session store for authentication
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.userSettings = new Map();
    this.streams = new Map();
    this.tracks = new Map();
    this.posts = new Map();
    this.genres = new Map();
    this.follows = new Map();
    this.likes = new Map();
    this.comments = new Map();
    
    this.userId = 1;
    this.userSettingsId = 1;
    this.streamId = 1;
    this.trackId = 1;
    this.postId = 1;
    this.genreId = 1;
    this.followId = 1;
    this.likeId = 1;
    this.commentId = 1;
    
    // Create memory session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize with some seed data
    this.seedData();
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      isStreaming: false,
      followerCount: 0,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async incrementFollowerCount(userId: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.followerCount += 1;
      this.users.set(userId, user);
    }
  }
  
  async decrementFollowerCount(userId: number): Promise<void> {
    const user = this.users.get(userId);
    if (user && user.followerCount > 0) {
      user.followerCount -= 1;
      this.users.set(userId, user);
    }
  }
  
  // User Settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(
      settings => settings.userId === userId
    );
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const id = this.userSettingsId++;
    const userSettings: UserSettings = {
      ...settings,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userSettings.set(id, userSettings);
    return userSettings;
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existingSettings = await this.getUserSettings(userId);
    
    if (!existingSettings) {
      // If no settings exist, create new ones with defaults plus updates
      return this.createUserSettings({
        userId,
        uiColor: settings.uiColor || "#8B5CF6",
        enableAutoplay: settings.enableAutoplay !== undefined ? settings.enableAutoplay : true,
        defaultSortType: settings.defaultSortType || "recent"
      });
    }

    // Update existing settings
    const updatedSettings: UserSettings = {
      ...existingSettings,
      ...(settings as Partial<UserSettings>),
      updatedAt: new Date()
    };
    
    this.userSettings.set(existingSettings.id, updatedSettings);
    return updatedSettings;
  }
  
  // Posts
  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }
  
  async getRecentPosts(): Promise<Post[]> {
    return Array.from(this.posts.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }
  
  async getPostsByUser(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postId++;
    const post: Post = {
      ...insertPost,
      id,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.posts.set(id, post);
    return post;
  }
  
  // Streams
  async getStream(id: number): Promise<Stream | undefined> {
    return this.streams.get(id);
  }
  
  async getFeaturedStreams(): Promise<Stream[]> {
    return Array.from(this.streams.values())
      .filter(stream => stream.isLive)
      .sort((a, b) => b.viewerCount - a.viewerCount)
      .slice(0, 6);
  }
  
  async getStreamsByUser(userId: number): Promise<Stream[]> {
    return Array.from(this.streams.values())
      .filter(stream => stream.userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
  
  async createStream(insertStream: InsertStream): Promise<Stream> {
    const id = this.streamId++;
    const stream: Stream = {
      ...insertStream,
      id,
      isLive: true,
      viewerCount: 0,
      startedAt: new Date()
    };
    this.streams.set(id, stream);
    
    // Update user to be streaming
    const user = this.users.get(stream.userId);
    if (user) {
      user.isStreaming = true;
      this.users.set(user.id, user);
    }
    
    return stream;
  }
  
  async updateStream(id: number, data: Partial<Stream>): Promise<Stream | undefined> {
    const stream = this.streams.get(id);
    
    if (!stream) {
      return undefined;
    }
    
    const updatedStream = {
      ...stream,
      ...data
    };
    
    this.streams.set(id, updatedStream);
    
    // If stream is no longer live, update the user streaming status
    if (data.isLive === false) {
      const user = this.users.get(stream.userId);
      if (user) {
        user.isStreaming = false;
        this.users.set(user.id, user);
      }
    }
    
    return updatedStream;
  }
  
  async updateStreamViewerCount(id: number, count: number): Promise<void> {
    const stream = this.streams.get(id);
    
    if (stream) {
      stream.viewerCount = count;
      this.streams.set(id, stream);
    }
  }
  
  // Tracks
  async getTrack(id: number): Promise<Track | undefined> {
    return this.tracks.get(id);
  }
  
  async getRecentTracks(): Promise<Track[]> {
    return Array.from(this.tracks.values())
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 10);
  }
  
  async getTracksByUser(userId: number): Promise<Track[]> {
    return Array.from(this.tracks.values())
      .filter(track => track.userId === userId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }
  
  async createTrack(insertTrack: InsertTrack): Promise<Track> {
    const id = this.trackId++;
    const track: Track = {
      ...insertTrack,
      id,
      playCount: 0,
      likeCount: 0,
      uploadedAt: new Date()
    };
    this.tracks.set(id, track);
    return track;
  }
  
  // Genres
  async getGenres(): Promise<Genre[]> {
    return Array.from(this.genres.values());
  }
  
  async createGenre(insertGenre: InsertGenre): Promise<Genre> {
    const id = this.genreId++;
    const genre: Genre = { ...insertGenre, id };
    this.genres.set(id, genre);
    return genre;
  }
  
  // Follows
  async createFollow(insertFollow: InsertFollow): Promise<Follow> {
    const id = this.followId++;
    const follow: Follow = { ...insertFollow, id };
    this.follows.set(id, follow);
    return follow;
  }
  
  async removeFollow(followerId: number, followedId: number): Promise<void> {
    const followToRemove = Array.from(this.follows.values()).find(
      f => f.followerId === followerId && f.followedId === followedId
    );
    
    if (followToRemove) {
      this.follows.delete(followToRemove.id);
    }
  }
  
  async isFollowing(followerId: number, followedId: number): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      f => f.followerId === followerId && f.followedId === followedId
    );
  }
  
  async getFollowers(userId: number): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(f => f.followedId === userId)
      .map(f => f.followerId);
    
    return Promise.all(followerIds.map(id => this.getUser(id)))
      .then(users => users.filter(Boolean) as User[]);
  }
  
  async getFollowing(userId: number): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(f => f.followerId === userId)
      .map(f => f.followedId);
    
    return Promise.all(followingIds.map(id => this.getUser(id)))
      .then(users => users.filter(Boolean) as User[]);
  }
  
  // Likes
  async createLike(insertLike: InsertLike): Promise<Like> {
    const id = this.likeId++;
    const like: Like = { ...insertLike, id, createdAt: new Date() };
    this.likes.set(id, like);
    
    // Update like count on the content
    if (insertLike.contentType === 'track') {
      const track = this.tracks.get(insertLike.contentId);
      if (track) {
        track.likeCount += 1;
        this.tracks.set(track.id, track);
      }
    } else if (insertLike.contentType === 'post') {
      const post = this.posts.get(insertLike.contentId);
      if (post) {
        post.likeCount += 1;
        this.posts.set(post.id, post);
      }
    }
    
    return like;
  }
  
  async removeLike(userId: number, contentId: number, contentType: string): Promise<void> {
    const likeToRemove = Array.from(this.likes.values()).find(
      l => l.userId === userId && l.contentId === contentId && l.contentType === contentType
    );
    
    if (likeToRemove) {
      this.likes.delete(likeToRemove.id);
      
      // Update like count on the content
      if (contentType === 'track') {
        const track = this.tracks.get(contentId);
        if (track && track.likeCount > 0) {
          track.likeCount -= 1;
          this.tracks.set(track.id, track);
        }
      } else if (contentType === 'post') {
        const post = this.posts.get(contentId);
        if (post && post.likeCount > 0) {
          post.likeCount -= 1;
          this.posts.set(post.id, post);
        }
      }
    }
  }
  
  async isLiked(userId: number, contentId: number, contentType: string): Promise<boolean> {
    return Array.from(this.likes.values()).some(
      l => l.userId === userId && l.contentId === contentId && l.contentType === contentType
    );
  }
  
  async getLikeCount(contentId: number, contentType: string): Promise<number> {
    return Array.from(this.likes.values()).filter(
      l => l.contentId === contentId && l.contentType === contentType
    ).length;
  }
  
  async getUserLikes(userId: number, contentType: string): Promise<number[]> {
    return Array.from(this.likes.values())
      .filter(l => l.userId === userId && l.contentType === contentType)
      .map(l => l.contentId);
  }
  
  // Comments
  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }
  
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentId++;
    const comment: Comment = {
      ...insertComment,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      likeCount: 0
    };
    this.comments.set(id, comment);
    
    // Update comment count on the content
    if (insertComment.contentType === 'track') {
      const track = this.tracks.get(insertComment.contentId);
      if (track) {
        // Ensure track has commentCount property or add it
        if (!('commentCount' in track)) {
          (track as any).commentCount = 0;
        }
        (track as any).commentCount += 1;
        this.tracks.set(track.id, track);
      }
    } else if (insertComment.contentType === 'post') {
      const post = this.posts.get(insertComment.contentId);
      if (post) {
        post.commentCount += 1;
        this.posts.set(post.id, post);
      }
    }
    
    return comment;
  }
  
  async updateComment(id: number, text: string): Promise<Comment | undefined> {
    const comment = this.comments.get(id);
    
    if (!comment) {
      return undefined;
    }
    
    const updatedComment: Comment = {
      ...comment,
      text,
      updatedAt: new Date()
    };
    
    this.comments.set(id, updatedComment);
    return updatedComment;
  }
  
  async deleteComment(id: number): Promise<void> {
    const comment = this.comments.get(id);
    
    if (comment) {
      this.comments.delete(id);
      
      // Update comment count on the content
      if (comment.contentType === 'track') {
        const track = this.tracks.get(comment.contentId);
        if (track && (track as any).commentCount > 0) {
          (track as any).commentCount -= 1;
          this.tracks.set(track.id, track);
        }
      } else if (comment.contentType === 'post') {
        const post = this.posts.get(comment.contentId);
        if (post && post.commentCount > 0) {
          post.commentCount -= 1;
          this.posts.set(post.id, post);
        }
      }
    }
  }
  
  async getCommentsByContent(contentId: number, contentType: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(c => c.contentId === contentId && c.contentType === contentType && !c.parentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getReplies(commentId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(c => c.parentId === commentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  
  // Track play count
  async incrementTrackPlayCount(trackId: number): Promise<void> {
    const track = this.tracks.get(trackId);
    if (track) {
      track.playCount += 1;
      this.tracks.set(trackId, track);
    }
  }
  
  // Creators
  async getRecommendedCreators(): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.followerCount - a.followerCount)
      .slice(0, 10);
  }
  
  // Seed data
  private seedData() {
    // Create genres
    const genres = [
      "Electronic", "Hip Hop", "Lo-Fi", "House", "Indie", "Techno", "Trap", "Ambient", "Jazz", "R&B"
    ];
    
    genres.forEach(name => {
      const id = this.genreId++;
      this.genres.set(id, { id, name });
    });
    
    // Create users (creators)
    // We use a simple string for development to avoid hashing complexity
    // In production, these would be properly hashed via auth.ts hashPassword function
    const plainPassword = "password123";
    
    const creators = [
      { 
        username: "djshadow", 
        password: plainPassword, 
        displayName: "DJ Shadow", 
        bio: "Electronic music producer and DJ specializing in deep house and techno. Based in Berlin.", 
        profileImageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&h=150&q=80",
        followerCount: 23400
      },
      { 
        username: "basstheory", 
        password: plainPassword, 
        displayName: "Bass Theory", 
        bio: "Bass music producer and DJ. Creating heavy beats since 2010.", 
        profileImageUrl: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&h=150&q=80",
        followerCount: 18700
      },
      { 
        username: "melodichouse", 
        password: plainPassword, 
        displayName: "Melodic House", 
        bio: "Melodic house and techno producer. Crafting emotional electronic journeys.", 
        profileImageUrl: "https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&h=150&q=80",
        followerCount: 32100
      },
      { 
        username: "djez", 
        password: plainPassword, 
        displayName: "DJ EZ", 
        bio: "House music producer and DJ based in London", 
        profileImageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&h=150&q=80",
        followerCount: 45600
      },
      { 
        username: "beatcrafter", 
        password: plainPassword, 
        displayName: "BeatCrafter", 
        bio: "Hip hop and trap beatmaker. Teaching the art of sampling and production.", 
        profileImageUrl: "https://images.unsplash.com/photo-1581068506097-9f5cf2b3c8e3?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&h=150&q=80",
        followerCount: 12300
      },
      { 
        username: "chillhop", 
        password: plainPassword, 
        displayName: "ChillHop Records", 
        bio: "Lo-fi beats and chill vibes. The perfect soundtrack for your study sessions.", 
        profileImageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&h=150&q=80",
        followerCount: 87500
      }
    ];
    
    creators.forEach(creator => {
      const id = this.userId++;
      this.users.set(id, { 
        ...creator, 
        id, 
        isStreaming: false, 
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Random date within last 90 days
      });
    });
    
    // Create streams
    const streams = [
      {
        userId: 1,
        title: "Deep House Vibes",
        description: "Late night deep house session with all the good vibes. Join us for some relaxing beats and chat!",
        thumbnailUrl: "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
        isLive: true,
        viewerCount: 1256,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        category: "House",
        tags: ["House", "Electronic", "Deep House"]
      },
      {
        userId: 2,
        title: "Bass Music Production",
        description: "Creating heavy bass music live. Watch the process from start to finish.",
        thumbnailUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
        isLive: false,
        viewerCount: 0,
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        category: "Bass",
        tags: ["Bass", "Tutorial", "Production"]
      },
      {
        userId: 3,
        title: "Melodic Techno Journey",
        description: "Live DJ set featuring the best melodic techno tracks of the month.",
        thumbnailUrl: "https://images.unsplash.com/photo-1574169208507-84376144848b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
        isLive: true,
        viewerCount: 865,
        startedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        category: "Techno",
        tags: ["Melodic", "Techno", "DJ Set"]
      },
      {
        userId: 4,
        title: "Beat Making 101",
        description: "Learn how to make beats from scratch",
        thumbnailUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
        isLive: true,
        viewerCount: 856,
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        category: "Tutorial",
        tags: ["Hip Hop", "Tutorial"]
      },
      {
        userId: 6,
        title: "Lofi & Chill",
        description: "Relaxing beats to study/chill to",
        thumbnailUrl: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=340&q=80",
        isLive: true,
        viewerCount: 3400,
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        category: "Lo-Fi",
        tags: ["Lo-Fi", "Chill"]
      }
    ];
    
    streams.forEach(stream => {
      const id = this.streamId++;
      this.streams.set(id, { ...stream, id });
      
      // Update user streaming status
      if (stream.isLive) {
        const user = this.users.get(stream.userId);
        if (user) {
          user.isStreaming = true;
          this.users.set(user.id, user);
        }
      }
    });
    
    // Create tracks
    const tracks = [
      {
        userId: 1,
        title: "Midnight Drive",
        artistName: "DJ Shadow",
        coverUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1b8de8c112.mp3?filename=floating-abstract-142819.mp3",
        duration: 222,
        playCount: 1200,
        likeCount: 342,
        uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        genre: "Synthwave"
      },
      {
        userId: 2,
        title: "Deep Blue",
        artistName: "Bass Theory",
        coverUrl: "https://images.unsplash.com/photo-1496293455970-f8581aae0e3b?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b0939c8.mp3?filename=chill-out-12624.mp3",
        duration: 258,
        playCount: 2500,
        likeCount: 645,
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        genre: "Ambient"
      },
      {
        userId: 3,
        title: "Urban Soul",
        artistName: "Melodic House",
        coverUrl: "https://images.unsplash.com/photo-1560800452-f2d475982b96?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/16/audio_1333dfb36d.mp3?filename=lofi-study-112191.mp3",
        duration: 185,
        playCount: 968,
        likeCount: 217,
        uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        genre: "Lo-Fi"
      },
      {
        userId: 6,
        title: "Forest Dreams",
        artistName: "ChillHop Records",
        coverUrl: "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2021/11/25/audio_f8eb536e68.mp3?filename=ambient-piano-amp-strings-10711.mp3",
        duration: 322,
        playCount: 3100,
        likeCount: 789,
        uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        genre: "Ambient"
      },
      {
        userId: 5,
        title: "Trap Soul",
        artistName: "BeatCrafter",
        coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_dbd97b0ac5.mp3?filename=hip-hop-rock-beats-118000.mp3",
        duration: 180,
        playCount: 4200,
        likeCount: 1250,
        uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        genre: "Trap"
      },
      {
        userId: 4,
        title: "House Party",
        artistName: "DJ EZ",
        coverUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/04/04/audio_9cdbe48bf2.mp3?filename=lifelike-126735.mp3",
        duration: 192,
        playCount: 5800,
        likeCount: 2100,
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        genre: "House"
      }
    ];
    
    tracks.forEach(track => {
      const id = this.trackId++;
      this.tracks.set(id, { ...track, id });
    });
    
    // Create some follows
    const follows = [
      { followerId: 1, followedId: 2 },
      { followerId: 1, followedId: 3 },
      { followerId: 2, followedId: 1 },
      { followerId: 2, followedId: 4 },
      { followerId: 3, followedId: 1 },
      { followerId: 4, followedId: 6 },
      { followerId: 5, followedId: 1 },
      { followerId: 5, followedId: 2 },
      { followerId: 5, followedId: 3 },
      { followerId: 6, followedId: 4 }
    ];
    
    follows.forEach(follow => {
      const id = this.followId++;
      this.follows.set(id, { ...follow, id });
    });
    
    // Create default user settings for each user
    Array.from(this.users.keys()).forEach(userId => {
      const id = this.userSettingsId++;
      this.userSettings.set(id, {
        id,
        userId,
        uiColor: "#8B5CF6", // Default purple color
        enableAutoplay: true,
        defaultSortType: "recent",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    // Create some sample posts
    const posts = [
      {
        userId: 1,
        title: "New Studio Setup!",
        content: "Just finished setting up my new studio space. Can't wait to start creating some new music here!",
        imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80",
        postType: PostType.IMAGE,
        tags: ["Studio", "Setup", "Music Production"]
      },
      {
        userId: 2,
        title: "Latest Track Preview",
        content: "Working on a new bass-heavy track. Here's a sneak peek of my workspace!",
        imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80",
        postType: PostType.IMAGE,
        tags: ["WIP", "Music", "Bass Music"]
      },
      {
        userId: 3,
        title: "Music Theory Tips",
        content: "Here's a quick tip for all producers: Learn your minor scales! They're the foundation of most electronic music genres, especially melodic techno and deep house.",
        postType: PostType.TEXT,
        tags: ["Music Theory", "Tips", "Production"]
      },
      {
        userId: 4,
        title: "Festival Announcement",
        content: "Excited to announce I'll be playing at Electronic Forest Festival next month! Who's coming?",
        imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80",
        postType: PostType.IMAGE,
        tags: ["Festival", "Live Performance", "Announcement"]
      },
      {
        userId: 5,
        title: "Sample Pack Release",
        content: "Just dropped my new sample pack 'Urban Beats Vol. 2' - perfect for hip-hop and trap productions!",
        postType: PostType.TEXT,
        tags: ["Sample Pack", "Release", "Hip Hop"]
      },
      {
        userId: 6,
        title: "Morning Coffee & Beats",
        content: "Nothing better than starting the day with coffee and making some chill beats.",
        imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80",
        postType: PostType.IMAGE,
        tags: ["Lofi", "Coffee", "Morning"]
      }
    ];
    
    posts.forEach(post => {
      const id = this.postId++;
      this.posts.set(id, {
        ...post,
        id,
        likeCount: Math.floor(Math.random() * 200),
        commentCount: Math.floor(Math.random() * 50),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    });
  }
}

export const storage = new MemStorage();
