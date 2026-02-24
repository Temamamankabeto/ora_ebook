import { http } from "./http";

export function createEbook(payload) {
  return http("/api/ebooks", { method:"POST", body: payload, auth:true });
}

export function myEbooks() {
  return http("/api/ebooks/mine", { auth:true });
}

export function ebookDetail(id) {
  return http(`/api/ebooks/${id}`, { auth:true });
}

export function editorQueue() {
  return http("/api/ebooks/editor/queue/all", { auth:true });
}

export function editorSetStatus(id, payload) {
  return http(`/api/ebooks/${id}/status`, { method:"POST", body: payload, auth:true });
}

export function submitRevision(id, payload) {
  return http(`/api/ebooks/${id}/revisions`, { method:"POST", body: payload, auth:true });
}

export function uploadFile(ebook_id, file, file_type="MANUSCRIPT") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("file_type", file_type);
  return http(`/api/ebooks/${ebook_id}/files`, { method:"POST", body: fd, auth:true, isForm:true });
}

export function publicLibrary() {
  return http("/api/public/library");
}
