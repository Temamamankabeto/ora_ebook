import { verifyToken } from "../utils/jwt.js";

export function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: "No token" });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
