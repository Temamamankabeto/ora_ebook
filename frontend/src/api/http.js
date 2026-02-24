const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("token") || "";
}

export async function http(path, { method="GET", body, auth=false, isForm=false } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth) headers["Authorization"] = `Bearer ${getToken()}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || "Request failed";
    throw new Error(msg);
  }
  return data;
}
