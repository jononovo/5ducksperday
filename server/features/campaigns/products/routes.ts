/**
 * Strategic Profiles Routes
 * Shared between HTML static and React chat systems
 * Manages strategic profile CRUD operations
 */

import { Express, Application } from "express";
import { storage } from "../../../storage";
import { getUserId } from "../../../utils/auth";

export function registerStrategicProfilesRoutes(app: Application, requireAuth: any) {
  
  // GET strategic profiles endpoint (alias for products)
  app.get('/api/strategic-profiles', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Fetch strategic profiles from storage
      const profiles = await storage.getStrategicProfiles(userId);
      
      // Map to frontend interface (add 'name' field)
      const mappedProfiles = profiles.map(profile => ({
        ...profile,
        name: profile.businessDescription || profile.productService || "Strategy Plan"
      }));
      
      res.json(mappedProfiles);
    } catch (error) {
      console.error('Error fetching strategic profiles:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch strategic profiles' 
      });
    }
  });

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

  // Products endpoint for Strategy Dashboard
  app.get('/api/products', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Fetch strategic profiles from storage
      const profiles = await storage.getStrategicProfiles(userId);
      
      // Map to frontend interface (add 'name' field)
      const mappedProfiles = profiles.map(profile => ({
        ...profile,
        name: profile.businessDescription || profile.productService || "Strategy Plan"
      }));
      
      res.json(mappedProfiles);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch products' 
      });
    }
  });

  // Get single product endpoint
  app.get('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const productId = parseInt(req.params.id);

      if (isNaN(productId)) {
        res.status(400).json({ message: 'Invalid product ID' });
        return;
      }

      // Fetch the specific profile
      const profiles = await storage.getStrategicProfiles(userId);
      const profile = profiles.find(p => p.id === productId);
      
      if (!profile) {
        res.status(404).json({ message: 'Product not found or access denied' });
        return;
      }

      // Map to frontend interface (add 'name' field)
      const mappedProfile = {
        ...profile,
        name: profile.businessDescription || profile.productService || "Strategy Plan"
      };
      
      res.json(mappedProfile);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch product' 
      });
    }
  });

  // Create new product endpoint
  app.post('/api/products', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { businessType, productService, customerFeedback, website, title, targetCustomers, uniqueAttributes, status } = req.body;
      
      // Create profile data
      const profileData = {
        userId,
        title: title || productService || 'New Product',
        businessType: businessType || 'product' as 'product' | 'service',
        businessDescription: productService || '',
        productService: productService || '',
        customerFeedback: customerFeedback || '',
        website: website || '',
        targetCustomers: targetCustomers || 'Target customers',
        status: status || 'completed' as const,
        uniqueAttributes: uniqueAttributes || []
      };
      
      const savedProfile = await storage.createStrategicProfile(profileData);
      
      // Map to frontend interface (add 'name' field)
      const mappedProfile = {
        ...savedProfile,
        name: savedProfile.businessDescription || savedProfile.productService || "Strategy Plan"
      };
      
      res.json(mappedProfile);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create product' 
      });
    }
  });

  // Update product endpoint
  app.patch('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const productId = parseInt(req.params.id);

      if (isNaN(productId)) {
        res.status(400).json({ message: 'Invalid product ID' });
        return;
      }

      // Verify profile belongs to user before updating
      const profiles = await storage.getStrategicProfiles(userId);
      const profileToUpdate = profiles.find(p => p.id === productId);
      
      if (!profileToUpdate) {
        res.status(404).json({ message: 'Product not found or access denied' });
        return;
      }

      // If setting as default, clear other defaults first
      if (req.body.isDefault === true) {
        await storage.clearDefaultStrategicProfiles(userId);
      }

      // Update the profile
      const updatedProfile = await storage.updateStrategicProfile(productId, req.body);
      
      // Map to frontend interface (add 'name' field)
      const mappedProfile = {
        ...updatedProfile,
        name: updatedProfile.businessDescription || updatedProfile.productService || "Strategy Plan"
      };
      
      res.json(mappedProfile);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update product' 
      });
    }
  });

  // Delete product endpoint (RESTful path)
  app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const productId = parseInt(req.params.id);

      if (isNaN(productId)) {
        res.status(400).json({ message: 'Invalid product ID' });
        return;
      }

      // Verify profile belongs to user before deleting
      const profiles = await storage.getStrategicProfiles(userId);
      const profileToDelete = profiles.find(p => p.id === productId);
      
      if (!profileToDelete) {
        res.status(404).json({ message: 'Product not found or access denied' });
        return;
      }

      // Delete the profile
      await storage.deleteStrategicProfile(productId);
      
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to delete product' 
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

  // Quick setup endpoint for Streak page activation
  app.post('/api/strategic-profiles/quick-setup', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { businessType, productService, customerFeedback, website, title } = req.body;
      
      // Validate required fields
      if (!businessType || !productService || !customerFeedback) {
        res.status(400).json({ 
          message: 'Missing required fields: businessType, productService, and customerFeedback are required' 
        });
        return;
      }
      
      // Create a new strategic profile with simplified data
      const profileData = {
        userId,
        title: title || productService.slice(0, 50) || 'Daily Sales Companion',
        businessType: businessType as 'product' | 'service',
        businessDescription: productService,
        productService,
        customerFeedback,
        website: website || '',
        targetCustomers: 'B2B customers', // Default for now
        status: 'completed' as const,
        uniqueAttributes: [customerFeedback], // Store customer feedback as unique attribute
      };
      
      const savedProfile = await storage.createStrategicProfile(profileData);
      
      res.json({
        success: true,
        profile: savedProfile,
        message: 'Product profile created successfully'
      });
    } catch (error) {
      console.error('Error in quick setup:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create product profile' 
      });
    }
  });
}