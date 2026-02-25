import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import { getEbookReviews } from "../controllers/ebooks.controller.js";
import {
  createSubmission,
  uploadManuscriptFile,
  listMySubmissions,
  getEbookDetail,
  editorQueue,
  setStatus,
  submitRevision
} from "../controllers/ebooks.controller.js";

const r = Router();

r.post("/", auth, requireRole("AUTHOR","ADMIN"), createSubmission);
r.get("/mine", auth, requireRole("AUTHOR","ADMIN"), listMySubmissions);
r.get("/:id", auth, getEbookDetail);

r.post("/:ebook_id/files", auth, upload.single("file"), uploadManuscriptFile);
r.post("/:id/revisions", auth, requireRole("AUTHOR","ADMIN"), submitRevision);

r.get("/editor/queue/all", auth, requireRole("EDITOR","ADMIN"), editorQueue);
r.post("/:id/status", auth, requireRole("EDITOR","ADMIN"), setStatus);
r.get("/:id/reviews", auth, requireRole("EDITOR", "ADMIN"), getEbookReviews);

export default r;
