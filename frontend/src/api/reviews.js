import { http } from "./http";

export function assignReviewer(payload) {
  return http("/api/reviews/assign", { method:"POST", body: payload, auth:true });
}

export function myReviewQueue() {
  return http("/api/reviews/mine", { auth:true });
}

export function acceptInvite(assignment_id) {
  return http(`/api/reviews/${assignment_id}/accept`, { method:"POST", auth:true });
}

export function submitReview(assignment_id, payload) {
  return http(`/api/reviews/${assignment_id}/submit`, { method:"POST", body: payload, auth:true });
}
