import { Router } from "express";
import { publicLibrary } from "../controllers/public.controller.js";
const r = Router();
r.get("/library", publicLibrary);
export default r;
