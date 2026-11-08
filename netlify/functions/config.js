import { json, getConfig } from "../lib/core.js";

export default async () => {
  const c = await getConfig();
  return json({ servicios: c.servicios, tipos: c.tipos, franjas: c.franjas, aviso: c.aviso });
};

export const config = { path: "/api/config" };
