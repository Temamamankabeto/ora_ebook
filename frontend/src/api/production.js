import { http } from "./http";

export function productionQueue() {
  return http("/api/production/queue", { auth:true });
}

export function startProduction(payload) {
  return http("/api/production/start", { method:"POST", body: payload, auth:true });
}

export function publish(payload) {
  return http("/api/production/publish", { method:"POST", body: payload, auth:true });
}
