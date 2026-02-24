import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { listUsers } from "../controllers/users.controller.js";

const r = Router();

// Editor/Admin only (so only editors can search reviewers for assignment)
r.get("/", auth, requireRole("EDITOR", "ADMIN"), listUsers);

export default r;