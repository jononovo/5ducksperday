import express, { type Express } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";

export function registerGuidanceRoutes(app: Express) {
  app.get("/api/guidance/progress", async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Demo user (id 1) is the fallback for unauthenticated requests
      // Return empty progress to ensure new users get fresh state
      if (userId === 1) {
        return res.json({
          completedQuests: [],
          completedChallenges: {},
          currentQuestId: null,
          currentChallengeIndex: 0,
          currentStepIndex: 0,
          settings: {}
        });
      }
      
      const progress = await storage.getUserGuidanceProgress(userId);
      
      if (!progress) {
        return res.json({
          completedQuests: [],
          completedChallenges: {},
          currentQuestId: null,
          currentChallengeIndex: 0,
          currentStepIndex: 0,
          settings: {}
        });
      }
      
      res.json({
        completedQuests: progress.completedQuests || [],
        completedChallenges: progress.completedChallenges || {},
        currentQuestId: progress.currentQuestId,
        currentChallengeIndex: progress.currentChallengeIndex || 0,
        currentStepIndex: progress.currentStepIndex || 0,
        settings: progress.settings || {}
      });
    } catch (error) {
      console.error("Error fetching guidance progress:", error);
      res.status(500).json({ message: "Failed to fetch guidance progress" });
    }
  });

  app.patch("/api/guidance/progress", async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Don't save progress for demo user (unauthenticated fallback)
      if (userId === 1) {
        return res.json({ success: true });
      }
      
      const { completedQuests, completedChallenges, currentQuestId, currentChallengeIndex, currentStepIndex, settings } = req.body;
      
      const updated = await storage.updateUserGuidanceProgress(userId, {
        completedQuests,
        completedChallenges,
        currentQuestId,
        currentChallengeIndex,
        currentStepIndex,
        settings
      });
      
      res.json({
        completedQuests: updated.completedQuests || [],
        completedChallenges: updated.completedChallenges || {},
        currentQuestId: updated.currentQuestId,
        currentChallengeIndex: updated.currentChallengeIndex || 0,
        currentStepIndex: updated.currentStepIndex || 0,
        settings: updated.settings || {}
      });
    } catch (error) {
      console.error("Error updating guidance progress:", error);
      res.status(500).json({ message: "Failed to update guidance progress" });
    }
  });
}
