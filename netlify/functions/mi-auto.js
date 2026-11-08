import { json, bad, getOrders, normPlate, tooMany, ESTADOS, ACTIVOS } from "../lib/core.js";

export default async (req) => {
  const url = new URL(req.url);
  const patente = normPlate(url.searchParams.get("patente"));
  const tel4 = String(url.searchParams.get("tel4") || "").replace(/\D/g, "");
  if (!patente || tel4.length !== 4) return bad("Escribí la patente y los últimos 4 números de tu celular");
  if (await tooMany(req, "miauto", 15)) return bad("Demasiadas consultas. Probá de nuevo en una hora.", 429);

  const mias = (await getOrders())
    .filter((o) => o.patente === patente && o.telefono.endsWith(tel4) && o.estado !== "cancelado")
    .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? 1 : -1));
  if (!mias.length) return bad("No encontramos ese vehículo con ese celular. Revisá los datos.", 404);

  const actual = mias.find((o) => ACTIVOS.includes(o.estado) || o.estado === "listo") || null;
  const pasadas = mias.filter((o) => o.estado === "entregado");
  const conProximo = pasadas.find((o) => o.proximoService);
  const conPresupuesto = actual && ["presupuesto", "aprobado", "repuesto", "reparacion", "listo"].includes(actual.estado);

  return json({
    patente,
    vehiculo: mias[0].vehiculo,
    nombre: mias[0].nombre.split(" ")[0],
    estados: ESTADOS.filter((e) => e.id !== "cancelado").map(({ id, nombre, vuelo }) => ({ id, nombre, vuelo })),
    actual: actual && {
      codigo: actual.codigo, estado: actual.estado, fecha: actual.fecha, hora: actual.hora,
      listoEstimado: actual.listoEstimado, box: actual.box,
      trabajos: actual.estimado.lineas.map((l) => l.nombre),
      presupuesto: conPresupuesto && actual.presupuesto.length ? actual.presupuesto : null,
      historial: actual.historial,
    },
    pasadas: pasadas.slice(0, 8).map((o) => ({
      fecha: o.fecha, km: o.km, trabajos: (o.presupuesto.length ? o.presupuesto.map((p) => p.desc) : o.estimado.lineas.map((l) => l.nombre)),
    })),
    proximoService: conProximo ? conProximo.proximoService : null,
  });
};

export const config = { path: "/api/mi-auto" };
