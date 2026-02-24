import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { financeQueue, setPayment } from "../controllers/finance.controller.js";

const r = Router();
r.get("/queue", auth, requireRole("FINANCE","ADMIN"), financeQueue);
r.post("/payment", auth, requireRole("FINANCE","ADMIN"), setPayment);
export default r;
