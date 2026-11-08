import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, randomInt } from "node:crypto";

// En Netlify se usa Blobs; en Render (server.js) un almacén en archivos con la misma interfaz
export const store = () => globalThis.__HANGAR_FILE_STORE__ || getStore({ name: "hangar-taller", consistency: "strong" });

/* ---------- respuestas ---------- */
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
export const bad = (msg, status = 400) => json({ error: msg }, status);
export async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

/* ---------- fechas en hora argentina (UTC-3) ---------- */
export const nowAR = () => new Date(Date.now() - 3 * 3600e3);
export const isoDay = (d) => d.toISOString().slice(0, 10);
export const todayISO = () => isoDay(nowAR());
export const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
};
export const weekday = (iso) => new Date(iso + "T12:00:00Z").getUTCDay(); // 0 = domingo
const minutesNow = () => nowAR().getUTCHours() * 60 + nowAR().getUTCMinutes();
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/* ---------- configuración por defecto (precios de ejemplo, el taller los edita) ---------- */
export const DEFAULT_CONFIG = {
  version: 1,
  servicios: [
    { id: "diagnostico", nombre: "Diagnóstico computarizado", detalle: "Escaneo con equipo Bosch, lectura de fallas y testigos encendidos. Para cuando no sabés qué tiene.", desde: 38000, horas: 1 },
    { id: "inyeccion", nombre: "Inyección electrónica", detalle: "Prueba y limpieza ultrasónica de inyectores, bombas inyectoras y common rail.", desde: 95000, horas: 3 },
    { id: "service", nombre: "Service y mantenimiento", detalle: "Aceite y filtros, niveles, correas y puesta a punto. El aceite se cotiza según el motor.", desde: 60000, horas: 1.5 },
    { id: "electricidad", nombre: "Electricidad y baterías", detalle: "Arranque, alternador, carga y cambio de batería, limpieza de bornes.", desde: 32000, horas: 1 },
    { id: "mecanica", nombre: "Mecánica general", detalle: "Frenos, embrague, distribución y reparaciones de motor.", desde: 70000, horas: 3 },
    { id: "suspension", nombre: "Suspensión y dirección", detalle: "Diagnóstico y cambio de amortiguadores, bujes y extremos.", desde: 65000, horas: 2.5 },
    { id: "alineacion", nombre: "Alineación y balanceo", detalle: "Geometría de ruedas, balanceo, montaje y rotación de neumáticos.", desde: 30000, horas: 1 },
    { id: "optimizacion", nombre: "Optimización electrónica", detalle: "Reprogramación de la computadora con MDQ Racing: más respuesta y mejor consumo.", desde: 180000, horas: 2 },
  ],
  tipos: [
    { id: "auto", nombre: "Auto", factor: 1 },
    { id: "camioneta", nombre: "Camioneta / SUV / pick-up", factor: 1.2 },
    { id: "utilitario", nombre: "Utilitario / camión liviano", factor: 1.35 },
    { id: "moto", nombre: "Moto", factor: 0.7 },
  ],
  franjas: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:30"],
  cupoFranja: 2, // vehículos que pueden entrar en cada franja
  cupoDia: 9, // ingresos máximos por día
  boxes: 4,
  horasBox: 7, // horas de trabajo por box por día
  cerrados: [],
  aviso: "",
};

export async function getConfig() {
  const c = await store().get("config", { type: "json" });
  return c ? { ...structuredClone(DEFAULT_CONFIG), ...c } : structuredClone(DEFAULT_CONFIG);
}

/* ---------- órdenes ---------- */
export async function getOrders() {
  const s = store();
  await ensureSeed();
  const { blobs } = await s.list({ prefix: "orden/" });
  const items = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  return items.filter(Boolean);
}
export const saveOrder = (o) => store().setJSON("orden/" + o.codigo, o);
export const getOrder = (codigo) => store().get("orden/" + codigo, { type: "json" });

export const ESTADOS = [
  { id: "reservado", nombre: "Turno reservado", vuelo: "PROGRAMADO" },
  { id: "recibido", nombre: "Ingresó al taller", vuelo: "EN PLATAFORMA" },
  { id: "diagnostico", nombre: "En diagnóstico", vuelo: "EN REVISIÓN" },
  { id: "presupuesto", nombre: "Presupuesto enviado", vuelo: "ESPERA OK" },
  { id: "aprobado", nombre: "Presupuesto aprobado", vuelo: "APROBADO" },
  { id: "repuesto", nombre: "Esperando repuesto", vuelo: "DEMORADO" },
  { id: "reparacion", nombre: "En reparación", vuelo: "EN BOX" },
  { id: "listo", nombre: "Listo para retirar", vuelo: "LISTO" },
  { id: "entregado", nombre: "Entregado", vuelo: "PARTIÓ" },
  { id: "cancelado", nombre: "Cancelado", vuelo: "CANCELADO" },
];
export const ACTIVOS = ["reservado", "recibido", "diagnostico", "presupuesto", "aprobado", "repuesto", "reparacion"];
export const estadoNombre = (id) => ESTADOS.find((e) => e.id === id)?.nombre || id;

/* ---------- reglas del taller ---------- */
export const isClosed = (cfg, iso) => [0, 6].includes(weekday(iso)) || cfg.cerrados.includes(iso);

export function quote(cfg, { servicios = [], tipo = "auto" }) {
  const t = cfg.tipos.find((x) => x.id === tipo);
  if (!t) throw new Error("Elegí un tipo de vehículo válido");
  const ids = [...new Set(servicios)];
  if (ids.length === 0) ids.push("diagnostico");
  if (ids.length > cfg.servicios.length) throw new Error("Demasiados servicios");
  const lineas = [];
  let horas = 0;
  for (const id of ids) {
    const s = cfg.servicios.find((x) => x.id === id);
    if (!s) throw new Error("Servicio no válido");
    lineas.push({ id, nombre: s.nombre, precio: Math.round((s.desde * t.factor) / 500) * 500 });
    horas += s.horas * t.factor;
  }
  // si además de otro trabajo pide diagnóstico, el escaneo se bonifica
  if (ids.length > 1 && ids.includes("diagnostico")) {
    const i = lineas.findIndex((l) => l.id === "diagnostico");
    lineas[i] = { ...lineas[i], nombre: lineas[i].nombre + " (bonificado con el trabajo)", precio: 0 };
  }
  const total = lineas.reduce((a, l) => a + l.precio, 0);
  return { lineas, total, horas: Math.round(horas * 100) / 100, tipoNombre: t.nombre, servicios: ids };
}

const ocupa = (o) => o.estado !== "cancelado";

export function availability(cfg, orders, days = 21) {
  const out = [];
  const hoy = todayISO();
  const ahora = minutesNow();
  for (let i = 0; out.length < 12 && i < days; i++) {
    const fecha = addDays(hoy, i);
    if (isClosed(cfg, fecha)) continue;
    const delDia = orders.filter((o) => o.fecha === fecha && ocupa(o));
    const lleno = delDia.length >= cfg.cupoDia;
    const franjas = cfg.franjas.map((hora) => {
      const usados = delDia.filter((o) => o.hora === hora).length;
      // hoy se puede reservar hasta 45 minutos antes de la franja
      const pasada = i === 0 && toMin(hora) - 45 <= ahora;
      return { hora, libres: Math.max(0, cfg.cupoFranja - usados), ok: !lleno && !pasada && usados < cfg.cupoFranja };
    });
    out.push({ fecha, libres: franjas.filter((f) => f.ok).reduce((a, f) => a + f.libres, 0), franjas });
  }
  return out;
}

/** Fecha estimada de entrega: se descuentan las horas comprometidas antes de este vehículo */
export function estimateReady(cfg, orders, fecha, horas) {
  const capDia = cfg.boxes * cfg.horasBox;
  let backlog = 0;
  for (const o of orders) if (ACTIVOS.includes(o.estado) && o.fecha <= fecha) backlog += o.horas || 0;
  let d = todayISO();
  while (d < fecha) { if (!isClosed(cfg, d)) backlog -= capDia; d = addDays(d, 1); }
  let restante = Math.max(0, backlog) + horas;
  d = fecha;
  for (let guard = 0; guard < 60; guard++) {
    if (!isClosed(cfg, d)) {
      restante -= capDia * (d === fecha ? 0.5 : 1); // el día de ingreso se trabaja a medias
      if (restante <= 0) break;
    }
    d = addDays(d, 1);
  }
  return d;
}

/* ---------- validación ---------- */
export const clean = (s, max = 120) => String(s ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
export const cleanText = (s, max = 600) => String(s ?? "").replace(/[<>]/g, "").trim().slice(0, max);
export function normPhone(s) {
  let d = String(s || "").replace(/\D/g, "");
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  const m = d.match(/^(\d{2,4})15(\d{6,8})$/); // quita el 15 después del código de área
  if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
  return d.length === 10 ? d : null;
}
export function normPlate(s) {
  const p = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  // autos: ABC123 o AB123CD · motos: A123BCD o 123ABC
  return /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{3}[A-Z]{3}|\d{3}[A-Z]{3})$/.test(p) ? p : null;
}
export const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

export async function newCode() {
  const s = store();
  for (let i = 0; i < 25; i++) {
    const c = "HG-" + randomInt(1000, 9999);
    if (!(await s.get("orden/" + c))) return c;
  }
  throw new Error("No se pudo generar el código");
}

/** Arma una orden nueva validando todo del lado del servidor */
export async function buildOrder(input, { admin = false } = {}) {
  const cfg = await getConfig();
  const orders = await getOrders();
  const nombre = clean(input.nombre, 60);
  const telefono = normPhone(input.telefono);
  const patente = normPlate(input.patente);
  const marca = clean(input.marca, 30);
  const modelo = clean(input.modelo, 40);
  const anio = Number(input.anio) || null;
  const km = Math.round(Number(String(input.km || "").replace(/\D/g, "")) || 0);
  const sintoma = cleanText(input.sintoma, 500);
  if (nombre.length < 2) throw new Error("Escribí tu nombre");
  if (!telefono) throw new Error("Revisá el celular: código de área + número, sin 0 ni 15");
  if (!patente) throw new Error("Revisá la patente (ej.: AB123CD o ABC123)");
  if (!marca) throw new Error("Escribí la marca del vehículo");
  if (anio && (anio < 1960 || anio > new Date().getFullYear() + 1)) throw new Error("Revisá el año");
  if (km > 2_000_000) throw new Error("Revisá el kilometraje");
  const servicios = Array.isArray(input.servicios) ? input.servicios.map(String).slice(0, 12) : [];
  if (!servicios.length && !sintoma) throw new Error("Elegí un servicio o contanos qué le pasa");
  const q = quote(cfg, { servicios, tipo: String(input.tipo || "") });

  let fecha = String(input.fecha || "");
  let hora = String(input.hora || "");
  if (admin && input.ingresoAhora) {
    fecha = todayISO();
    const m = minutesNow();
    hora = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  } else {
    const dia = availability(cfg, orders).find((d) => d.fecha === fecha);
    const franja = dia?.franjas.find((f) => f.hora === hora);
    if (!franja || (!franja.ok && !admin)) throw new Error("Ese horario ya no está disponible. Elegí otro.");
  }
  if (!admin) {
    const activos = orders.filter((o) => o.telefono === telefono && o.estado === "reservado" && o.fecha >= todayISO());
    if (activos.length >= 2) throw new Error("Ya tenés dos turnos reservados. Escribinos por WhatsApp para sumar otro.");
  }
  const tipo = cfg.tipos.find((t) => t.id === input.tipo);
  const creada = new Date().toISOString();
  return {
    codigo: await newCode(),
    nombre, telefono, patente,
    vehiculo: { tipo: tipo.id, tipoNombre: tipo.nombre, marca, modelo, anio },
    km, sintoma, servicios: q.servicios,
    estimado: { lineas: q.lineas, total: q.total, horas: q.horas },
    horas: q.horas,
    fecha, hora,
    listoEstimado: estimateReady(cfg, orders, fecha, q.horas),
    estado: admin && input.ingresoAhora ? "recibido" : "reservado",
    box: null, presupuesto: [], nota: "", proximoService: null,
    historial: [{ estado: admin && input.ingresoAhora ? "recibido" : "reservado", at: creada }],
    origen: admin ? "taller" : "web",
    creada,
  };
}

/* ---------- límite de intentos (consulta "Mi auto") ---------- */
export async function tooMany(req, bucket, max = 12) {
  const ip = (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "x").split(",")[0].trim();
  const key = `rl/${bucket}/${ip.replace(/[^0-9a-f.:]/gi, "")}/${new Date().toISOString().slice(0, 13)}`;
  const n = Number(await store().get(key)) || 0;
  if (n >= max) return true;
  await store().set(key, String(n + 1));
  return false;
}

/* ---------- sesión del panel (HMAC) ---------- */
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
const sign = (payload) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function checkPassword(pw) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = createHmac("sha256", "hangar").update(String(pw || "")).digest();
  const b = createHmac("sha256", "hangar").update(real).digest();
  return timingSafeEqual(a, b);
}
export function makeToken(hours = 12) {
  const payload = Buffer.from(JSON.stringify({ r: "torre", exp: Date.now() + hours * 3600e3 })).toString("base64url");
  return payload + "." + sign(payload);
}
export function requireAdmin(req) {
  if (!secret()) return false;
  const h = req.headers.get("authorization") || "";
  const [payload, sig] = (h.startsWith("Bearer ") ? h.slice(7) : "").split(".");
  if (!payload || !sig) return false;
  const exp = sign(payload);
  if (exp.length !== sig.length || !timingSafeEqual(Buffer.from(exp), Buffer.from(sig))) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now(); } catch { return false; }
}

/* ---------- datos de prueba para que la Torre no arranque vacía ---------- */
let seeding = null;
export function ensureSeed() {
  return (seeding ||= seed().catch((e) => { seeding = null; throw e; }));
}
export async function wipe() {
  const s = store();
  for (const prefix of ["orden/", "flota/", "seeded"]) {
    const { blobs } = await s.list({ prefix });
    await Promise.all(blobs.map((b) => s.delete(b.key)));
  }
  seeding = null;
}

const nextOpen = (cfg, iso, dir = 1) => { let d = iso; while (isClosed(cfg, d)) d = addDays(d, dir); return d; };

async function seed() {
  const s = store();
  if (await s.get("seeded")) return;
  await s.set("seeded", "1"); // se marca antes para no duplicar si entran dos pedidos a la vez
  const cfg = await getConfig();
  const hoy = todayISO();
  // nombre, tel, patente, tipo, marca, modelo, año, km, servicios, offsetDías, hora, estado, box, nota
  const demo = [
    ["Federico Aguirre", "1158234410", "AE482KD", "auto", "Volkswagen", "Gol Trend", 2017, 98400, ["service"], 0, "09:00", "reparacion", 1, "Filtro de aire muy sucio, se cambió."],
    ["Transportes Del Paraná", "3484217753", "AC917TR", "utilitario", "Renault", "Kangoo", 2019, 187300, ["inyeccion"], -1, "10:00", "repuesto", 2, "Inyector 3 con falla. Repuesto pedido a Bosch, llega jueves."],
    ["Camila Ferraro", "1144907722", "AF203MB", "camioneta", "Toyota", "Hilux", 2021, 64100, ["alineacion", "suspension"], 0, "10:00", "diagnostico", 3, ""],
    ["Hernán Ledesma", "1162019938", "OMK461", "auto", "Fiat", "Palio", 2014, 152900, ["electricidad"], -2, "11:00", "listo", null, "Batería nueva 65 Ah colocada."],
    ["Valeria Correa", "1139480015", "AD771PL", "auto", "Chevrolet", "Onix", 2020, 71200, ["diagnostico"], 0, "14:00", "reservado", null, ""],
    ["Martín Sosa", "3484662109", "A094KJD", "moto", "Honda", "CB 250 Twister", 2022, 18700, ["service"], 0, "15:00", "reservado", null, ""],
    ["Inés Paredes", "1150772341", "AB566GT", "auto", "Peugeot", "208", 2018, 83500, ["mecanica"], -1, "09:00", "presupuesto", 4, "Pastillas y discos delanteros gastados."],
    ["Lucas Benítez", "1127763390", "AG118XR", "camioneta", "Ford", "Ranger", 2022, 41200, ["optimizacion"], 1, "09:00", "reservado", null, ""],
    ["Rocío Méndez", "1166230087", "PQR902", "auto", "Renault", "Clio", 2015, 120400, ["service", "alineacion"], 1, "11:00", "reservado", null, ""],
    ["Gustavo Ríos", "3484558201", "AA905HZ", "auto", "Toyota", "Etios", 2017, 110300, ["inyeccion"], 2, "10:00", "reservado", null, ""],
    ["Federico Aguirre", "1158234410", "AE482KD", "auto", "Volkswagen", "Gol Trend", 2017, 88900, ["alineacion"], -170, "10:00", "entregado", null, ""],
    ["Paula Giménez", "1145662310", "AC340NB", "auto", "Ford", "Ka", 2018, 79400, ["service"], -175, "09:00", "entregado", null, "Aceite 5W30 sintético."],
    ["Diego Cardozo", "3484701145", "NFG228", "camioneta", "Volkswagen", "Amarok", 2013, 201500, ["service"], -168, "14:00", "entregado", null, ""],
    ["Sandra Molina", "1168812204", "AD210CE", "auto", "Citroën", "C3", 2019, 58600, ["electricidad"], -9, "15:00", "entregado", null, ""],
  ];
  for (const [nombre, telefono, patente, tipo, marca, modelo, anio, km, servicios, off, hora, estado, box, nota] of demo) {
    const fecha = nextOpen(cfg, addDays(hoy, off), off < 0 ? -1 : 1);
    const q = quote(cfg, { servicios, tipo });
    const t = cfg.tipos.find((x) => x.id === tipo);
    const creada = new Date(Date.now() + (off - 2) * 864e5).toISOString();
    const entregado = estado === "entregado";
    const avanzados = ["presupuesto", "aprobado", "repuesto", "reparacion", "listo", "entregado"].includes(estado);
    await saveOrder({
      codigo: await newCode(), demo: true,
      nombre, telefono, patente,
      vehiculo: { tipo, tipoNombre: t.nombre, marca, modelo, anio },
      km, sintoma: "", servicios: q.servicios,
      estimado: { lineas: q.lineas, total: q.total, horas: q.horas }, horas: q.horas,
      fecha, hora, listoEstimado: nextOpen(cfg, addDays(fecha, Math.max(1, Math.ceil(q.horas / 3)))),
      estado, box,
      presupuesto: avanzados ? q.lineas.map((l) => ({ desc: l.nombre, precio: l.precio })) : [],
      nota,
      // a los services entregados hace ~6 meses les toca el próximo este mes
      proximoService: entregado ? { fecha: addDays(fecha, 180), km: Math.ceil((km + 10000) / 1000) * 1000 } : null,
      historial: [{ estado: "reservado", at: creada }, ...(estado !== "reservado" ? [{ estado, at: new Date(Date.now() + off * 864e5).toISOString() }] : [])],
      origen: "web", creada,
    });
  }
  const flotas = [
    { empresa: "Logística Garín SRL", contacto: "Mariana Ojeda", telefono: "1148820193", email: "", cantidad: 12, tipos: ["utilitario", "camioneta"], mensaje: "Necesitamos service preventivo cada 10.000 km para 12 Sprinter y Hilux.", estado: "nueva" },
    { empresa: "Agro Los Cardales", contacto: "Raúl Bianchi", telefono: "3484330981", email: "", cantidad: 5, tipos: ["camioneta"], mensaje: "Pick-ups de campo, nos interesa alineación y tren delantero seguido.", estado: "contactada" },
  ];
  for (const [i, f] of flotas.entries()) {
    const id = "FL-" + randomInt(100, 999);
    await s.setJSON("flota/" + id, { id, demo: true, ...f, creada: new Date(Date.now() - (i + 1) * 2 * 864e5).toISOString() });
  }
}
