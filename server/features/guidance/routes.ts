import express, { type Express } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";

export function registerGuidanceRoutes(app: Express) {
  app.get("/api/guidance/progress", async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log("[GuidanceRoutes] GET /api/guidance/progress - userId:", userId);
      
      // Demo user (id 1) is the fallback for unauthenticated requests
      // Return empty progress to ensure new users get fresh state
      if (userId === 1) {
        console.log("[GuidanceRoutes] Returning empty progress for demo user (id=1)");
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
      console.log("[GuidanceRoutes] Database progress for user", userId, ":", progress);
      
      if (!progress) {
        console.log("[GuidanceRoutes] No progress found, returning defaults");
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
      console.error("[GuidanceRoutes] Error fetching guidance progress:", error);
      res.status(500).json({ message: "Failed to fetch guidance progress" });
    }
  });

  app.patch("/api/guidance/progress", async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log("[GuidanceRoutes] PATCH /api/guidance/progress - userId:", userId);
      console.log("[GuidanceRoutes] Request body:", req.body);
      
      // Don't save progress for demo user (unauthenticated fallback)
      if (userId === 1) {
        console.log("[GuidanceRoutes] SKIPPING SAVE - demo user (id=1), not persisting to database");
        return res.json({ success: true });
      }
      
      const { completedQuests, completedChallenges, currentQuestId, currentChallengeIndex, currentStepIndex, settings } = req.body;
      
      console.log("[GuidanceRoutes] Saving progress for user", userId, ":", {
        completedQuests,
        completedChallenges,
        currentQuestId,
        currentChallengeIndex,
        currentStepIndex,
      });
      
      const updated = await storage.updateUserGuidanceProgress(userId, {
        completedQuests,
        completedChallenges,
        currentQuestId,
        currentChallengeIndex,
        currentStepIndex,
        settings
      });
      
      console.log("[GuidanceRoutes] Successfully saved progress for user", userId);
      
      res.json({
        completedQuests: updated.completedQuests || [],
        completedChallenges: updated.completedChallenges || {},
        currentQuestId: updated.currentQuestId,
        currentChallengeIndex: updated.currentChallengeIndex || 0,
        currentStepIndex: updated.currentStepIndex || 0,
        settings: updated.settings || {}
      });
    } catch (error) {
      console.error("[GuidanceRoutes] Error updating guidance progress:", error);
      res.status(500).json({ message: "Failed to update guidance progress" });
    }
  });
}
