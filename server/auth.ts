import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Ensure there's a salt separator
    if (!stored.includes('.')) {
      console.error('Invalid password format, no salt separator found');
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    
    if (!hashed || !salt) {
      console.error('Missing hash or salt component');
      return false;
    }
    
    console.log(`Comparing with salt: ${salt} (${salt.length} chars)`);
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Password comparison result: ${result}`);
    
    return result;
  } catch (error) {
    console.error('Error during password comparison:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "traxx-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Only use secure in production
      httpOnly: true, // Prevents client-side JS from reading the cookie
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax', // Allows cookies to be sent in top-level navigations
      path: '/' // Ensure cookie is available for all paths
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Authenticating user ${username} with password length: ${password.length}`);
        
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User with username ${username} not found`);
          return done(null, false);
        }
        
        console.log(`Found user ${username} (ID: ${user.id}), stored password hash length: ${user.password.length}`);

        // Development mode - add a backdoor password for testing
        // WARNING: This should NEVER be in production code!
        if (process.env.NODE_ENV !== 'production' && password === 'admin1234') {
          console.log(`⚠️ WARNING: Using backdoor password for user ${username}`);
          return done(null, user);
        }
        
        // For demo accounts and development, allow direct comparison with plaintext passwords
        // In production, this would only use the secure password comparison
        if (user.password === password) {
          console.log(`User ${username} authenticated with plaintext password`);
          return done(null, user);
        } else if (await comparePasswords(password, user.password)) {
          console.log(`User ${username} authenticated with hashed password`);
          return done(null, user);
        } else {
          console.log(`Invalid password for user ${username}`);
          return done(null, false);
        }
      } catch (error) {
        console.error(`Authentication error:`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  function generateVerificationToken(): string {
    // Using imported randomBytes function from crypto
    return randomBytes(32).toString('hex');
  }

  // Email functionality is stubbed for now since it's not fully implemented
  async function sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    console.log(`[EMAIL STUB] Verification email would be sent to ${email}`);
    console.log(`[EMAIL STUB] Verification URL: ${verifyUrl}`);
    
    // In a production environment, we would use a proper email service
    // await transporter.sendMail({...});
    
    return Promise.resolve();
  }

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const verificationToken = generateVerificationToken();
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isVerified: false,
        verificationToken,
        verificationTokenExpiry
      });

      await sendVerificationEmail(email, verificationToken);

      // Automatically create default user settings for the new user
      await storage.createUserSettings({
        userId: user.id,
        uiColor: "#7c3aed", // Default purple theme
        enableAutoplay: true,
        defaultSortType: "recent"
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Send user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt with username:", req.body.username);
    
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string }) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed: Invalid credentials");
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log("Authentication successful for user:", user.id);
      
      req.login(user, (err: Error | null) => {
        if (err) {
          console.error("Session creation error:", err);
          return next(err);
        }
        
        // Log session information
        console.log("Session established:", {
          id: req.sessionID,
          cookie: req.session.cookie,
          user: user.id
        });
        
        // Send user without password
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Simple password reset flow (not production-ready)
  // In a real app, this would use proper token management and email delivery
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "No account found with this email" });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // For development, just log the token
      console.log(`[PASSWORD RESET] Token for user ${user.id}: ${resetToken}`);
      console.log(`[PASSWORD RESET] Link: http://localhost:3000/reset-password?token=${resetToken}`);

      // In a real implementation, we would save this token to the database
      // await storage.storeResetToken(user.id, resetToken, tokenExpiry);
      
      // And send an email with the reset link
      // await sendPasswordResetEmail(email, resetToken);

      res.json({ message: "Password reset instructions sent (check server logs)" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to process password reset" });
    }
  });

  // Simple password reset implementation
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword, userId } = req.body;
      
      // In a real app, we would verify the token from the database
      // const resetInfo = await storage.getResetToken(token);
      // if (!resetInfo || resetInfo.expiry < new Date()) {
      //   return res.status(400).json({ message: "Invalid or expired reset token" });
      // }

      // For dev purposes, we're accepting the userId directly
      if (!userId) {
        return res.status(400).json({ message: "UserId is required" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password directly
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      console.log(`Password updated for user ${userId}`);

      // In a real app we would also invalidate the token
      // await storage.removeResetToken(token);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json({ message: "Not logged in" });
    }
    
    req.logout((err: Error | null) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user session:", {
      id: req.sessionID,
      authenticated: req.isAuthenticated(),
      user: req.user ? (req.user as SelectUser).id : 'none'
    });
    
    if (!req.isAuthenticated()) {
      console.log("GET /api/user - Not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    console.log("GET /api/user - Authenticated user:", (req.user as SelectUser).id);
    
    // Send user without password
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
}