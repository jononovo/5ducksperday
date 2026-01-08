import { Router, Request, Response } from "express";
import { z } from "zod";
import { LinkedInAuthService } from "../services/auth-service";

const router = Router();

const connectSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const verifySchema = z.object({
  pin: z.string().min(1, "PIN is required"),
});

const totpSchema = z.object({
  totpSecret: z.string().min(1, "TOTP secret is required"),
});

router.post("/connect", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const validationResult = connectSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
    }

    const { email, password } = validationResult.data;
    const result = await LinkedInAuthService.connect(req.user.id, email, password);

    if (result.success) {
      return res.json({
        success: true,
        profile: result.profile,
      });
    }

    if (result.needsVerification) {
      return res.json({
        success: false,
        needsVerification: true,
        challengeType: result.challengeType,
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error || "Connection failed",
    });
  } catch (error) {
    console.error("LinkedIn connect error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/verify", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const validationResult = verifySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
    }

    const { pin } = validationResult.data;
    const result = await LinkedInAuthService.verify(req.user.id, pin);

    if (result.success) {
      return res.json({
        success: true,
        profile: result.profile,
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error || "Verification failed",
    });
  } catch (error) {
    console.error("LinkedIn verify error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/totp", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const validationResult = totpSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
    }

    const { totpSecret } = validationResult.data;
    const success = await LinkedInAuthService.setupTotp(req.user.id, totpSecret);

    return res.json({ success });
  } catch (error) {
    console.error("LinkedIn TOTP setup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/status", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const status = await LinkedInAuthService.getStatus(req.user.id);

    return res.json(status);
  } catch (error) {
    console.error("LinkedIn status error:", error);
    return res.status(500).json({
      connected: false,
      message: "Internal server error",
    });
  }
});

router.post("/check-session", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const valid = await LinkedInAuthService.checkSession(req.user.id);

    return res.json({ valid });
  } catch (error) {
    console.error("LinkedIn session check error:", error);
    return res.status(500).json({
      valid: false,
      message: "Internal server error",
    });
  }
});

router.delete("/disconnect", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const success = await LinkedInAuthService.disconnect(req.user.id);

    return res.json({ success });
  } catch (error) {
    console.error("LinkedIn disconnect error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
