import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  assignReviewer,
  myReviewQueue,
  submitReview,
  acceptInvite,
  cancelAssignment
} from "../controllers/reviews.controller.js";

const r = Router();

// Editor assigns + cancels
r.post("/assign", auth, requireRole("EDITOR", "ADMIN"), assignReviewer);
r.post("/:assignment_id/cancel", auth, requireRole("EDITOR", "ADMIN"), cancelAssignment);

// Reviewer actions
r.get("/mine", auth, requireRole("REVIEWER", "ADMIN"), myReviewQueue);
r.post("/:assignment_id/accept", auth, requireRole("REVIEWER", "ADMIN"), acceptInvite);
r.post("/:assignment_id/submit", auth, requireRole("REVIEWER", "ADMIN"), submitReview);

export default r;