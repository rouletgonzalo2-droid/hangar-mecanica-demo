import { json, getConfig, getOrders, availability } from "../lib/core.js";

export default async () => {
  const [cfg, orders] = await Promise.all([getConfig(), getOrders()]);
  return json({ dias: availability(cfg, orders) });
};

export const config = { path: "/api/disponibilidad" };
