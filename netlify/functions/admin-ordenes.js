import {
  json, bad, body, requireAdmin, getConfig, getOrders, getOrder, saveOrder, buildOrder, availability,
  ESTADOS, clean, cleanText, isISO, todayISO, estadoNombre,
} from "../lib/core.js";

export default async (req) => {
  if (!requireAdmin(req)) return bad("Sesión vencida. Volvé a entrar.", 401);

  if (req.method === "GET") {
    const [cfg, ordenes] = await Promise.all([getConfig(), getOrders()]);
    return json({ ordenes, config: cfg, hoy: todayISO(), estados: ESTADOS, disponibilidad: availability(cfg, ordenes) });
  }

  // ingreso cargado desde el taller (cliente que llega sin turno o turno tomado por teléfono)
  if (req.method === "POST") {
    try {
      const o = await buildOrder(await body(req), { admin: true });
      await saveOrder(o);
      return json({ orden: o }, 201);
    } catch (e) {
      return bad(e.message);
    }
  }

  if (req.method !== "PATCH") return bad("Método no permitido", 405);
  const { codigo, cambios = {} } = await body(req);
  const o = await getOrder(String(codigo || ""));
  if (!o) return bad("No existe esa orden", 404);
  const cfg = await getConfig();

  if (cambios.estado !== undefined) {
    if (!ESTADOS.some((e) => e.id === cambios.estado)) return bad("Estado no válido");
    if (cambios.estado !== o.estado) {
      o.estado = cambios.estado;
      o.historial.push({ estado: o.estado, at: new Date().toISOString() });
      if (["listo", "entregado", "cancelado", "reservado"].includes(o.estado)) o.box = null;
    }
  }
  if (cambios.box !== undefined) {
    const box = cambios.box === null ? null : Number(cambios.box);
    if (box !== null && !(Number.isInteger(box) && box >= 1 && box <= cfg.boxes)) return bad("Box no válido");
    if (box !== null) {
      const ocupado = (await getOrders()).find((x) => x.box === box && x.codigo !== o.codigo);
      if (ocupado) return bad(`El box ${box} está ocupado por ${ocupado.patente}`);
    }
    o.box = box;
  }
  if (cambios.km !== undefined) {
    const km = Math.round(Number(cambios.km));
    if (!(km >= 0 && km <= 2_000_000)) return bad("Kilometraje no válido");
    o.km = km;
  }
  if (cambios.nota !== undefined) o.nota = cleanText(cambios.nota, 800);
  if (cambios.presupuesto !== undefined) {
    if (!Array.isArray(cambios.presupuesto) || cambios.presupuesto.length > 30) return bad("Presupuesto no válido");
    const items = [];
    for (const it of cambios.presupuesto) {
      const desc = clean(it.desc, 90);
      const precio = Math.round(Number(it.precio));
      if (!desc) continue;
      if (!(precio >= 0 && precio <= 50_000_000)) return bad(`Revisá el precio de "${desc}"`);
      items.push({ desc, precio });
    }
    o.presupuesto = items;
  }
  if (cambios.proximoService !== undefined) {
    const p = cambios.proximoService;
    if (p === null) o.proximoService = null;
    else {
      if (!isISO(p.fecha)) return bad("Fecha del próximo service no válida");
      const km = p.km ? Math.round(Number(p.km)) : null;
      if (km !== null && !(km > 0 && km <= 2_000_000)) return bad("Km del próximo service no válidos");
      o.proximoService = { fecha: p.fecha, km };
    }
  }
  if (cambios.avisadoService !== undefined) {
    if (cambios.avisadoService !== null && !isISO(cambios.avisadoService)) return bad("Fecha de aviso no válida");
    o.avisadoService = cambios.avisadoService;
  }
  if (cambios.listoEstimado !== undefined) {
    if (!isISO(cambios.listoEstimado)) return bad("Fecha estimada no válida");
    o.listoEstimado = cambios.listoEstimado;
  }
  await saveOrder(o);
  return json({ orden: o, mensaje: `${o.patente}: ${estadoNombre(o.estado)}` });
};

export const config = { path: "/api/admin/ordenes" };
