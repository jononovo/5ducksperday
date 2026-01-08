import { Router } from "express";
import authRoutes from "./routes/auth-routes";

const router = Router();

router.use("/", authRoutes);

export default router;

export { LinkedInAuthService } from "./services/auth-service";
export * from "./types";
