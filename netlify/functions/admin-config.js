import { json, bad, body, requireAdmin, getConfig, store, clean, isISO } from "../lib/core.js";

export default async (req) => {
  if (!requireAdmin(req)) return bad("Sesión vencida. Volvé a entrar.", 401);
  const cfg = await getConfig();
  if (req.method === "GET") return json(cfg);
  if (req.method !== "PUT") return bad("Método no permitido", 405);

  const b = await body(req);
  if (Array.isArray(b.servicios)) {
    for (const s of b.servicios) {
      const cur = cfg.servicios.find((x) => x.id === s.id);
      if (!cur) continue;
      const desde = Math.round(Number(s.desde));
      const horas = Number(s.horas);
      if (!(desde >= 0 && desde <= 20_000_000)) return bad(`Revisá el precio de ${cur.nombre}`);
      if (!(horas > 0 && horas <= 40)) return bad(`Revisá las horas de ${cur.nombre}`);
      cur.desde = desde;
      cur.horas = Math.round(horas * 4) / 4;
      if (s.detalle !== undefined) cur.detalle = clean(s.detalle, 160) || cur.detalle;
    }
  }
  const int = (v, min, max, msg) => {
    const n = Math.round(Number(v));
    if (!(n >= min && n <= max)) throw new Error(msg);
    return n;
  };
  try {
    if (b.cupoFranja !== undefined) cfg.cupoFranja = int(b.cupoFranja, 1, 10, "Cupo por franja: entre 1 y 10");
    if (b.cupoDia !== undefined) cfg.cupoDia = int(b.cupoDia, 1, 60, "Cupo por día: entre 1 y 60");
    if (b.boxes !== undefined) cfg.boxes = int(b.boxes, 1, 12, "Boxes: entre 1 y 12");
    if (b.horasBox !== undefined) cfg.horasBox = int(b.horasBox, 1, 14, "Horas por box: entre 1 y 14");
  } catch (e) {
    return bad(e.message);
  }
  if (Array.isArray(b.franjas)) {
    const f = [...new Set(b.franjas.map(String).filter((h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h)))].sort();
    if (!f.length || f.length > 12) return bad("Cargá entre 1 y 12 horarios de ingreso (HH:MM)");
    cfg.franjas = f;
  }
  if (Array.isArray(b.cerrados)) cfg.cerrados = [...new Set(b.cerrados.filter(isISO))].sort().slice(-120);
  if (b.aviso !== undefined) cfg.aviso = clean(b.aviso, 160);
  await store().setJSON("config", cfg);
  return json(cfg);
};

export const config = { path: "/api/admin/config" };
