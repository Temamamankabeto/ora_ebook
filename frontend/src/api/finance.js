import { http } from "./http";

export function financeQueue() {
  return http("/api/finance/queue", { auth:true });
}

export function setPayment(payload) {
  return http("/api/finance/payment", { method:"POST", body: payload, auth:true });
}
