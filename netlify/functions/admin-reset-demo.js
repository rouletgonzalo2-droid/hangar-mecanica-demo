import { json, bad, requireAdmin, wipe, ensureSeed } from "../lib/core.js";

// Borra los datos de la demo y vuelve a cargar los de ejemplo (no toca precios ni ajustes)
export default async (req) => {
  if (!requireAdmin(req)) return bad("Sesión vencida. Volvé a entrar.", 401);
  if (req.method !== "POST") return bad("Método no permitido", 405);
  await wipe();
  await ensureSeed();
  return json({ ok: true });
};

export const config = { path: "/api/admin/reset-demo" };
