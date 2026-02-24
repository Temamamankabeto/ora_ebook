import { http } from "./http";

export function listReviewers(search = "") {
  const params = new URLSearchParams();
  params.set("role", "REVIEWER");
  if (search) params.set("q", search);
  return http(`/api/users?${params.toString()}`, { auth: true });
}