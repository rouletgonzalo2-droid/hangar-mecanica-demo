import { randomInt } from "node:crypto";
import { json, bad, body, clean, cleanText, normPhone, store, tooMany, ensureSeed } from "../lib/core.js";

const TIPOS = ["auto", "camioneta", "utilitario", "moto", "camion"];

export default async (req) => {
  if (req.method !== "POST") return bad("Método no permitido", 405);
  if (await tooMany(req, "flota", 5)) return bad("Ya recibimos tu pedido. Te contactamos a la brevedad.", 429);
  const b = await body(req);
  const empresa = clean(b.empresa, 80);
  const contacto = clean(b.contacto, 60);
  const telefono = normPhone(b.telefono);
  const email = clean(b.email, 80);
  const cantidad = Math.round(Number(b.cantidad));
  const tipos = Array.isArray(b.tipos) ? b.tipos.filter((t) => TIPOS.includes(t)) : [];
  const mensaje = cleanText(b.mensaje, 600);
  if (empresa.length < 2) return bad("Escribí el nombre de la empresa");
  if (contacto.length < 2) return bad("Escribí quién es el contacto");
  if (!telefono) return bad("Revisá el celular: código de área + número, sin 0 ni 15");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Revisá el email");
  if (!(cantidad >= 1 && cantidad <= 500)) return bad("¿Cuántos vehículos tiene la flota?");
  if (!tipos.length) return bad("Marcá qué tipo de vehículos tienen");
  await ensureSeed();
  const id = "FL-" + randomInt(1000, 9999);
  await store().setJSON("flota/" + id, {
    id, empresa, contacto, telefono, email, cantidad, tipos, mensaje, estado: "nueva", creada: new Date().toISOString(),
  });
  return json({ ok: true, id }, 201);
};

export const config = { path: "/api/flotas" };
