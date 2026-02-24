import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { productionQueue, startProduction, publish } from "../controllers/production.controller.js";

const r = Router();
r.get("/queue", auth, requireRole("CONTENT_MANAGER","ADMIN"), productionQueue);
r.post("/start", auth, requireRole("CONTENT_MANAGER","ADMIN"), startProduction);
r.post("/publish", auth, requireRole("CONTENT_MANAGER","ADMIN"), publish);
export default r;
