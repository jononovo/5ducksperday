/**
 * Strategic Profiles Routes
 * Shared between HTML static and React chat systems
 * Manages strategic profile CRUD operations
 */

import { Express } from "express";
import { storage } from "../../storage";

// Helper function to safely get user ID from request
function getUserId(req: any): number {
  try {
    // First check if user is authenticated through session
    if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.id) {
      return req.user.id;
    }
    
    // Then check for Firebase authentication
    if (req.firebaseUser && req.firebaseUser.id) {
      return req.firebaseUser.id;
    }
  } catch (error) {
    console.error('Error accessing user ID:', error);
  }
  
  // For non-authenticated users, fall back to demo user ID (1)
  return 1;
}

export function registerStrategicProfilesRoutes(app: Express, requireAuth: any) {
  
  // Delete strategic profile endpoint (for React Strategy Chat restart)
  app.delete('/api/strategic-profiles/:id', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const profileId = parseInt(req.params.id);

      if (isNaN(profileId)) {
        res.status(400).json({ message: 'Invalid profile ID' });
        return;
      }

      // Verify profile belongs to user before deleting
      const profiles = await storage.getStrategicProfiles(userId);
      const profileToDelete = profiles.find(p => p.id === profileId);
      
      if (!profileToDelete) {
        res.status(404).json({ message: 'Profile not found or access denied' });
        return;
      }

      // Delete the profile
      await storage.deleteStrategicProfile(profileId);
      
      res.json({ success: true, message: 'Profile deleted successfully' });
    } catch (error) {
      console.error('Error deleting strategic profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to delete profile' 
      });
    }
  });

  // Save strategy chat as product
  app.post('/api/strategic-profiles/save-from-chat', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const formData = req.body;
      
      // Get existing strategic profiles for this user
      const existingProfiles = await storage.getStrategicProfiles(userId);
      
      // Find the most recent profile that matches the form data (in-progress status)
      const matchingProfile = existingProfiles.find(profile => 
        profile.status === 'in_progress' &&
        profile.productService === formData.productService &&
        profile.customerFeedback === formData.customerFeedback &&
        profile.website === formData.website
      );
      
      if (matchingProfile) {
        // Update existing profile to completed status
        const updatedProfile = await storage.updateStrategicProfile(matchingProfile.id, {
          status: 'completed'
        });
        res.json(updatedProfile);
      } else {
        // Create new profile if no matching in-progress profile found
        const profileData = {
          userId,
          title: formData.businessDescription || formData.productService || 'Strategy Plan',
          businessType: formData.businessType || 'product',
          businessDescription: formData.productService || 'Strategic Plan',
          productService: formData.productService,
          customerFeedback: formData.customerFeedback,
          website: formData.website,
          targetCustomers: formData.productService || 'Target audience',
          status: 'completed' as const
        };
        
        const savedProfile = await storage.createStrategicProfile(profileData);
        res.json(savedProfile);
      }
    } catch (error) {
      console.error('Error saving strategic profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to save strategy' 
      });
    }
  });
}