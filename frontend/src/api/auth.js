import { http } from "./http";

export function register(payload) {
  return http("/api/auth/register", { method:"POST", body: payload });
}

export function login(payload) {
  return http("/api/auth/login", { method:"POST", body: payload });
}
