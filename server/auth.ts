import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import admin from "firebase-admin";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

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
      timestamp: new Date().toISOString()
    });
    return null;
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    console.log('Verifying ID token with Firebase Admin');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('Token verified successfully:', {
      email: decodedToken.email?.split('@')[0] + '@...',
      timestamp: new Date().toISOString()
    });

    // Get or create user in our database
    let user = await storage.getUserByEmail(decodedToken.email!);

    if (!user) {
      console.log('Creating new user in database:', {
        email: decodedToken.email?.split('@')[0] + '@...',
        timestamp: new Date().toISOString()
      });

      user = await storage.createUser({
        email: decodedToken.email!,
        username: decodedToken.email!.split('@')[0],
        password: await hashPassword(randomBytes(32).toString('hex')),
      });
    }

    return user;
  } catch (error) {
    console.error('Firebase token verification error:', {
      error,
      timestamp: new Date().toISOString()
    });
    return null;
  }
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

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

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
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/google-auth", async (req, res, next) => {
    try {
      const { email, username } = req.body;

      // Try to find user by email
      let user = await storage.getUserByEmail(email);

      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({
          email,
          username,
          // Generate a random password for Google Auth users
          password: await hashPassword(randomBytes(32).toString('hex')),
        });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json(req.user);
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
}