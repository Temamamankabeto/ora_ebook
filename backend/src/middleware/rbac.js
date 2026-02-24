import { q } from "../db/pool.js";

export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.uuid;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const r = await q(
        `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON r.uuid = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );

      const userRoles = r.rows.map(x => x.name);
      const ok = roles.some(role => userRoles.includes(role));
      if (!ok) return res.status(403).json({ success: false, message: "Forbidden" });

      req.user.roles = userRoles;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: "RBAC error" });
    }
  };
}
