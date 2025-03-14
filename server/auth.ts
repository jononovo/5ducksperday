import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import admin from "firebase-admin";

// Extend the session type to include gmailToken
declare module 'express-session' {
  interface SessionData {
    gmailToken?: string;
  }
}

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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Firebase token verification middleware
async function verifyFirebaseToken(req: Request): Promise<SelectUser | null> {
  const authHeader = req.headers.authorization;

  console.log('Verifying Firebase token:', {
    hasAuthHeader: !!authHeader,
    headerFormat: authHeader?.startsWith('Bearer ') ? 'valid' : 'invalid',
    hasFirebaseAdmin: !!admin.apps.length,
    timestamp: new Date().toISOString()
  });

  if (!authHeader?.startsWith('Bearer ') || !admin.apps.length) {
    console.warn('Token verification failed:', {
      reason: !authHeader?.startsWith('Bearer ') ? 'invalid header' : 'firebase admin not initialized',
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    console.log('Verifying ID token with Firebase Admin');
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Log the token scopes and claims
    console.log('Token verified successfully:', {
      email: decodedToken.email?.split('@')[0] + '@...',
      timestamp: new Date().toISOString()
    });

    if (!decodedToken.email) {
      console.warn('Token missing email claim');
      return null;
    }

    // Get or create user in our database
    let user = await storage.getUserByEmail(decodedToken.email);

    if (!user) {
      console.log('Creating new user in backend:', {
        email: decodedToken.email?.split('@')[0] + '@...',
        timestamp: new Date().toISOString()
      });

      user = await storage.createUser(decodedToken.email);
    }

    return user;
  } catch (error) {
    console.error('Firebase token verification error:', {
      error,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

// Add requireAuth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'temporary-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Update local strategy to use email
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email', // Change this to use email field
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Initialize Firebase Admin
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    try {
      if (!admin.apps.length) {
        console.log('Initializing Firebase Admin with config:', {
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        });

        admin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        });
        console.log('Firebase Admin initialized successfully');
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', {
        error,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    console.warn('Firebase Admin not initialized: missing project ID', {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  }


  // Add Firebase token verification to all authenticated routes
  app.use(async (req, res, next) => {
    if (!req.isAuthenticated()) {
      const firebaseUser = await verifyFirebaseToken(req);
      if (firebaseUser) {
        req.login(firebaseUser, (err) => {
          if (err) return next(err);
          next();
        });
        return;
      }
    }
    next();
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Check for existing email
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Add to the Google auth route
  app.post("/api/google-auth", async (req, res, next) => {
    try {
      const { email, username, accessToken } = req.body;

      console.log('Google auth endpoint received request:', { 
        hasEmail: !!email, 
        hasUsername: !!username,
        hasAccessToken: !!accessToken 
      });

      // Store Gmail token in session if provided
      if (accessToken) {
        req.session.gmailToken = accessToken;
        console.log('Stored Gmail token in session:', {
          hasToken: !!accessToken,
          sessionID: req.sessionID,
          timestamp: new Date().toISOString()
        });
      }

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Try to find user by email
      let user = await storage.getUserByEmail(email);

      if (!user) {
        // Create new user if doesn't exist
        try {
          user = await storage.createUser({
            email,
            username: username || email.split('@')[0],
            password: '',  // Not used for Google auth
          });
          console.log('Created new user:', { id: user.id, email: email.split('@')[0] + '@...' });
        } catch (createError) {
          console.error('Failed to create user:', createError);
          return res.status(500).json({ error: "Failed to create user account" });
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    } catch (err) {
      console.error('Google auth endpoint error:', err);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Add new route to check Gmail authorization status
  app.get("/api/gmail/auth-status", requireAuth, (req, res) => {
    const hasGmailToken = !!req.session.gmailToken;
    console.log('Checking Gmail auth status:', {
      hasToken: hasGmailToken,
      sessionID: req.sessionID,
      timestamp: new Date().toISOString()
    });
    res.json({ authorized: hasGmailToken });
  });
}