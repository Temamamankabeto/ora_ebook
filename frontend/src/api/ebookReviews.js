import { http } from "./http";

export function getEbookReviews(ebook_id) {
  return http(`/api/ebooks/${ebook_id}/reviews`, { auth: true });
}