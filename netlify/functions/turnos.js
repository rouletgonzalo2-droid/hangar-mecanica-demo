import { json, bad, body, buildOrder, saveOrder, getConfig, quote, tooMany } from "../lib/core.js";

export default async (req) => {
  const url = new URL(req.url);
  // presupuesto orientativo en vivo: lo calcula el servidor, nunca el navegador
  if (req.method === "GET" && url.searchParams.has("cotizar")) {
    try {
      const cfg = await getConfig();
      const servicios = (url.searchParams.get("servicios") || "").split(",").filter(Boolean);
      return json(quote(cfg, { servicios, tipo: url.searchParams.get("tipo") || "auto" }));
    } catch (e) {
      return bad(e.message);
    }
  }
  if (req.method !== "POST") return bad("Método no permitido", 405);
  if (await tooMany(req, "turno", 10)) return bad("Demasiados intentos. Probá en un rato o escribinos por WhatsApp.", 429);
  try {
    const o = await buildOrder(await body(req));
    await saveOrder(o);
    return json({
      codigo: o.codigo, fecha: o.fecha, hora: o.hora, listoEstimado: o.listoEstimado,
      patente: o.patente, vehiculo: o.vehiculo, lineas: o.estimado.lineas, total: o.estimado.total,
    }, 201);
  } catch (e) {
    return bad(e.message);
  }
};

export const config = { path: "/api/turnos" };
