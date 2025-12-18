import express, { type Express } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";
import { CreditRewardService } from "../billing/rewards/service";

// Default credits per challenge (can be overridden per challenge)
const DEFAULT_CHALLENGE_CREDITS = 110;

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
          settings: {}
        });
      }
      
      res.json({
        completedQuests: progress.completedQuests || [],
        completedChallenges: progress.completedChallenges || {},
        currentQuestId: progress.currentQuestId,
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
      
      const { completedQuests, completedChallenges, currentQuestId, settings } = req.body;
      
      // Get existing progress to detect newly completed challenges
      const existingProgress = await storage.getUserGuidanceProgress(userId);
      const existingCompletedChallenges: Record<string, string[]> = existingProgress?.completedChallenges || {};
      const incomingCompletedChallenges: Record<string, string[]> = completedChallenges || {};
      
      // Find newly completed challenges (in incoming but not in existing)
      const newlyCompleted: { questId: string; challengeId: string }[] = [];
      for (const [questId, challengeIds] of Object.entries(incomingCompletedChallenges)) {
        const existingForQuest = existingCompletedChallenges[questId] || [];
        for (const challengeId of challengeIds) {
          if (!existingForQuest.includes(challengeId)) {
            newlyCompleted.push({ questId, challengeId });
          }
        }
      }
      
      // Award credits for newly completed challenges
      const creditsAwarded: { challengeId: string; credits: number; credited: boolean }[] = [];
      for (const { questId, challengeId } of newlyCompleted) {
        try {
          const result = await CreditRewardService.awardChallengeCredits(
            userId,
            challengeId,
            DEFAULT_CHALLENGE_CREDITS
          );
          creditsAwarded.push({
            challengeId,
            credits: DEFAULT_CHALLENGE_CREDITS,
            credited: result.credited
          });
          console.log(`[GuidanceRoutes] Challenge credit award for ${challengeId}:`, result);
        } catch (error) {
          console.error(`[GuidanceRoutes] Failed to award credits for challenge ${challengeId}:`, error);
        }
      }
      
      console.log("[GuidanceRoutes] Saving progress for user", userId, ":", {
        completedQuests,
        completedChallenges,
        currentQuestId,
        newlyCompleted,
        creditsAwarded
      });
      
      const updated = await storage.updateUserGuidanceProgress(userId, {
        completedQuests,
        completedChallenges,
        currentQuestId,
        settings
      });
      
      console.log("[GuidanceRoutes] Successfully saved progress for user", userId);
      
      res.json({
        completedQuests: updated.completedQuests || [],
        completedChallenges: updated.completedChallenges || {},
        currentQuestId: updated.currentQuestId,
        settings: updated.settings || {},
        creditsAwarded
      });
    } catch (error) {
      console.error("[GuidanceRoutes] Error updating guidance progress:", error);
      res.status(500).json({ message: "Failed to update guidance progress" });
    }
  });
}
