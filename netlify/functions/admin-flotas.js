import { json, bad, body, requireAdmin, store, ensureSeed, cleanText } from "../lib/core.js";

const ESTADOS = ["nueva", "contactada", "presupuestada", "cerrada", "descartada"];

export default async (req) => {
  if (!requireAdmin(req)) return bad("Sesión vencida. Volvé a entrar.", 401);
  const s = store();
  await ensureSeed();
  if (req.method === "GET") {
    const { blobs } = await s.list({ prefix: "flota/" });
    const items = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean);
    return json({ flotas: items.sort((a, b) => (a.creada < b.creada ? 1 : -1)), estados: ESTADOS });
  }
  if (req.method !== "PATCH") return bad("Método no permitido", 405);
  const { id, estado, nota } = await body(req);
  const f = await s.get("flota/" + String(id || ""), { type: "json" });
  if (!f) return bad("No existe ese pedido", 404);
  if (estado !== undefined) {
    if (!ESTADOS.includes(estado)) return bad("Estado no válido");
    f.estado = estado;
  }
  if (nota !== undefined) f.nota = cleanText(nota, 600);
  await s.setJSON("flota/" + f.id, f);
  return json({ flota: f });
};

export const config = { path: "/api/admin/flotas" };
