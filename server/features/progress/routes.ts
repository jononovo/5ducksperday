import express, { type Express } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../utils/auth";
import { CreditRewardService } from "../billing/rewards/service";

export interface ProgressMilestoneConfig {
  milestoneId: string;
  credits: number;
  description?: string;
}

export interface NamespaceConfig {
  namespace: string;
  milestones: Record<string, ProgressMilestoneConfig>;
  defaultCredits?: number;
}

const NAMESPACE_CONFIGS: Record<string, NamespaceConfig> = {
  'form': {
    namespace: 'form',
    milestones: {
      'onboarding-section-a': { milestoneId: 'onboarding-section-a', credits: 50, description: 'Onboarding Section A' },
      'onboarding-section-b': { milestoneId: 'onboarding-section-b', credits: 75, description: 'Onboarding Section B' },
      'onboarding-section-c': { milestoneId: 'onboarding-section-c', credits: 100, description: 'Onboarding Section C' },
      'onboarding-section-d': { milestoneId: 'onboarding-section-d', credits: 120, description: 'Onboarding Section D' },
    },
    defaultCredits: 50
  },
  'challenge': {
    namespace: 'challenge',
    milestones: {},
    defaultCredits: 110
  },
  'easter-egg': {
    namespace: 'easter-egg',
    milestones: {},
    defaultCredits: 25
  }
};

export function registerProgressRoutes(app: Express) {
  app.get("/api/progress/:namespace", async (req, res) => {
    try {
      const { namespace } = req.params;
      const userId = getUserId(req);
      console.log(`[ProgressRoutes] GET /api/progress/${namespace} - userId:`, userId);
      
      if (userId === 1) {
        console.log("[ProgressRoutes] Returning empty progress for demo user (id=1)");
        return res.json({
          namespace,
          completedMilestones: [],
          metadata: {}
        });
      }
      
      const progress = await storage.getUserProgress(userId, namespace);
      console.log(`[ProgressRoutes] Database progress for user ${userId}, namespace ${namespace}:`, progress);
      
      if (!progress) {
        return res.json({
          namespace,
          completedMilestones: [],
          metadata: {}
        });
      }
      
      res.json({
        namespace: progress.namespace,
        completedMilestones: progress.completedMilestones || [],
        metadata: progress.metadata || {}
      });
    } catch (error) {
      console.error("[ProgressRoutes] Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.patch("/api/progress/:namespace", async (req, res) => {
    try {
      const { namespace } = req.params;
      const userId = getUserId(req);
      console.log(`[ProgressRoutes] PATCH /api/progress/${namespace} - userId:`, userId);
      console.log("[ProgressRoutes] Request body:", req.body);
      
      if (userId === 1) {
        console.log("[ProgressRoutes] SKIPPING SAVE - demo user (id=1), not persisting");
        return res.json({ success: true, completedMilestones: [], creditsAwarded: [] });
      }
      
      const { completedMilestones, metadata } = req.body;
      
      if (!Array.isArray(completedMilestones)) {
        return res.status(400).json({ message: "completedMilestones must be an array" });
      }
      
      const existingProgress = await storage.getUserProgress(userId, namespace);
      const existingMilestones = existingProgress?.completedMilestones || [];
      
      const newlyCompleted = completedMilestones.filter(
        (m: string) => !existingMilestones.includes(m)
      );
      
      const config = NAMESPACE_CONFIGS[namespace];
      const creditsAwarded: { milestoneId: string; credits: number; credited: boolean }[] = [];
      
      for (const milestoneId of newlyCompleted) {
        try {
          const milestoneConfig = config?.milestones[milestoneId];
          const credits = milestoneConfig?.credits ?? config?.defaultCredits ?? 50;
          const description = milestoneConfig?.description ?? `${namespace}:${milestoneId}`;
          const rewardKey = `${namespace}:${milestoneId}`;
          
          const result = await CreditRewardService.awardOneTimeCredits(
            userId,
            credits,
            rewardKey,
            `✨ ${description} completed`
          );
          
          creditsAwarded.push({
            milestoneId,
            credits,
            credited: result.credited
          });
          
          console.log(`[ProgressRoutes] Credit award for ${rewardKey}:`, result);
        } catch (error) {
          console.error(`[ProgressRoutes] Failed to award credits for ${milestoneId}:`, error);
        }
      }
      
      const updated = await storage.upsertUserProgress(userId, namespace, completedMilestones, metadata);
      
      console.log(`[ProgressRoutes] Successfully saved progress for user ${userId}, namespace ${namespace}`);
      
      res.json({
        namespace: updated.namespace,
        completedMilestones: updated.completedMilestones || [],
        metadata: updated.metadata || {},
        creditsAwarded
      });
    } catch (error) {
      console.error("[ProgressRoutes] Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  app.post("/api/progress/:namespace/milestone/:milestoneId", async (req, res) => {
    try {
      const { namespace, milestoneId } = req.params;
      const userId = getUserId(req);
      console.log(`[ProgressRoutes] POST /api/progress/${namespace}/milestone/${milestoneId} - userId:`, userId);
      
      if (userId === 1) {
        console.log("[ProgressRoutes] SKIPPING SAVE - demo user (id=1), not persisting");
        return res.json({ success: true, credited: false, alreadyCompleted: false });
      }
      
      const existingProgress = await storage.getUserProgress(userId, namespace);
      const existingMilestones = existingProgress?.completedMilestones || [];
      
      if (existingMilestones.includes(milestoneId)) {
        return res.json({
          success: true,
          credited: false,
          alreadyCompleted: true,
          completedMilestones: existingMilestones
        });
      }
      
      const config = NAMESPACE_CONFIGS[namespace];
      const milestoneConfig = config?.milestones[milestoneId];
      const credits = milestoneConfig?.credits ?? config?.defaultCredits ?? 50;
      const description = milestoneConfig?.description ?? `${namespace}:${milestoneId}`;
      const rewardKey = `${namespace}:${milestoneId}`;
      
      const result = await CreditRewardService.awardOneTimeCredits(
        userId,
        credits,
        rewardKey,
        `✨ ${description} completed`
      );
      
      const newMilestones = [...existingMilestones, milestoneId];
      await storage.upsertUserProgress(userId, namespace, newMilestones, existingProgress?.metadata as Record<string, any> | undefined);
      
      console.log(`[ProgressRoutes] Milestone ${milestoneId} completed for user ${userId}`);
      
      res.json({
        success: true,
        credited: result.credited,
        credits,
        alreadyCompleted: false,
        completedMilestones: newMilestones,
        newBalance: result.newBalance
      });
    } catch (error) {
      console.error("[ProgressRoutes] Error completing milestone:", error);
      res.status(500).json({ message: "Failed to complete milestone" });
    }
  });
}
