/**
 * This file directly imports ReplitStorage without attempting data migration
 */
import { ReplitStorage } from '../storage-switching/simplified-storage-replit';

// Create new instance with empty data
export const storage = new ReplitStorage();

// Initialize default data on first use
(async () => {
  try {
    // Check if any users exist
    const users = await storage.getUserByEmail("user@example.com");
    
    if (!users) {
      console.log("Initializing default user...");
      // Create default user
      await storage.createUser({
        email: "user@example.com",
        password: "password", // Will be hashed by createUser
        username: "demouser"
      });
      
      // Default data will be created by the createUser method
      console.log("Default user created!");
    }
  } catch (err) {
    console.error("Error initializing storage:", err);
  }
})();