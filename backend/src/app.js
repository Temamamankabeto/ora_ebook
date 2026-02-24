import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

import authRoutes from "./routes/auth.routes.js";
import ebookRoutes from "./routes/ebooks.routes.js";
import reviewRoutes from "./routes/reviews.routes.js";
import financeRoutes from "./routes/finance.routes.js";
import productionRoutes from "./routes/production.routes.js";
import publicRoutes from "./routes/public.routes.js";
import usersRoutes from "./routes/users.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

// serve uploads
const uploadDir = process.env.UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(path.resolve(uploadDir)));

app.use("/api/auth", authRoutes);
app.use("/api/ebooks", ebookRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/users", usersRoutes);

export default app;
