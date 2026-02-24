import { q } from "../db/pool.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";

export async function register(req, res) {
  const { full_name, email, password, role = "AUTHOR" } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const exists = await q("SELECT uuid FROM users WHERE email=$1", [email]);
  if (exists.rowCount) return res.status(409).json({ success: false, message: "Email exists" });

  const password_hash = await hashPassword(password);

  const u = await q(
    "INSERT INTO users(full_name,email,password_hash) VALUES($1,$2,$3) RETURNING uuid, full_name, email",
    [full_name, email, password_hash]
  );

  const roleRow = await q("SELECT uuid FROM roles WHERE name=$1", [role]);
  if (roleRow.rowCount) {
    await q("INSERT INTO user_roles(user_id, role_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [
      u.rows[0].uuid,
      roleRow.rows[0].uuid,
    ]);
  }

  const token = signToken({ uuid: u.rows[0].uuid, email: u.rows[0].email });
  res.json({ success: true, token, user: u.rows[0] });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const u = await q("SELECT uuid, full_name, email, password_hash FROM users WHERE email=$1", [email]);
  if (!u.rowCount) return res.status(401).json({ success: false, message: "Invalid credentials" });

  const ok = await verifyPassword(password, u.rows[0].password_hash);
  if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

  const token = signToken({ uuid: u.rows[0].uuid, email: u.rows[0].email });
  res.json({
    success: true,
    token,
    user: { uuid: u.rows[0].uuid, full_name: u.rows[0].full_name, email: u.rows[0].email },
  });
}
