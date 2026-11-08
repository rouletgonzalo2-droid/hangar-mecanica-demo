import { json, bad, body, checkPassword, makeToken, tooMany } from "../lib/core.js";

export default async (req) => {
  if (req.method !== "POST") return bad("Método no permitido", 405);
  if (!process.env.ADMIN_PASSWORD) return bad("Falta configurar ADMIN_PASSWORD en el hosting", 503);
  if (await tooMany(req, "login", 10)) return bad("Demasiados intentos. Esperá un rato.", 429);
  const { password } = await body(req);
  if (!checkPassword(password)) return bad("Clave incorrecta", 401);
  return json({ token: makeToken() });
};

export const config = { path: "/api/admin/login" };
