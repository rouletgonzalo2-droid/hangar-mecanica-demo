// Servidor para Render (o cualquier hosting con Node): sirve la web compilada (dist/)
// y ejecuta las mismas funciones de netlify/functions, guardando los datos en ./data.
import http from "node:http";
import { readFile, writeFile, mkdir, readdir, unlink, stat, rename } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const DATA = process.env.DATA_DIR || path.join(ROOT, "data");

// .env opcional para pruebas locales
if (existsSync(path.join(ROOT, ".env"))) {
  for (const line of readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

/* almacén en archivos con la interfaz de Netlify Blobs que usa core.js */
const fileFor = (key) => path.join(DATA, encodeURIComponent(key) + ".json");
const write = async (key, txt) => {
  await mkdir(DATA, { recursive: true });
  const tmp = fileFor(key) + ".tmp";
  await writeFile(tmp, txt);
  await rename(tmp, fileFor(key));
};
globalThis.__HANGAR_FILE_STORE__ = {
  async get(key, opts = {}) {
    try {
      const txt = await readFile(fileFor(key), "utf8");
      return opts.type === "json" ? JSON.parse(txt) : txt;
    } catch { return null; }
  },
  set: (key, value) => write(key, String(value)),
  setJSON: (key, value) => write(key, JSON.stringify(value)),
  async delete(key) { try { await unlink(fileFor(key)); } catch {} },
  async list({ prefix = "" } = {}) {
    await mkdir(DATA, { recursive: true });
    const keys = (await readdir(DATA)).filter((f) => f.endsWith(".json")).map((f) => decodeURIComponent(f.slice(0, -5)));
    return { blobs: keys.filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
  },
};

/* rutas de la API: se leen del `config.path` de cada función */
const routes = new Map();
const fnDir = path.join(ROOT, "netlify", "functions");
for (const f of await readdir(fnDir)) {
  if (!f.endsWith(".js")) continue;
  const mod = await import(pathToFileURL(path.join(fnDir, f)).href);
  routes.set(mod.config.path, mod.default);
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json", ".webmanifest": "application/manifest+json" };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  try {
    const handler = routes.get(url.pathname);
    if (handler) {
      const chunks = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 64 * 1024) { res.writeHead(413); return res.end(); }
        chunks.push(c);
      }
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
      headers.set("x-nf-client-connection-ip", (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim());
      const r = await handler(new Request(url, {
        method: req.method, headers,
        body: ["GET", "HEAD"].includes(req.method) || !chunks.length ? undefined : Buffer.concat(chunks),
      }));
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    if (url.pathname.startsWith("/api/")) { res.writeHead(404, { "content-type": "application/json" }); return res.end('{"error":"No existe"}'); }
    // archivos estáticos; cualquier otra ruta devuelve index.html (SPA)
    let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
    if (!file.startsWith(DIST)) { res.writeHead(400); return res.end(); }
    let ok = false;
    try { ok = (await stat(file)).isFile(); } catch {}
    if (!ok) file = path.join(DIST, "index.html");
    const ext = path.extname(file);
    res.writeHead(200, {
      "content-type": TYPES[ext] || "application/octet-stream",
      "cache-control": file.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
    });
    res.end(await readFile(file));
  } catch (e) {
    console.error(e);
    res.writeHead(500, { "content-type": "application/json" });
    res.end('{"error":"Error del servidor"}');
  }
});

const PORT = process.env.PORT || 3007;
server.listen(PORT, () => console.log(`Hangar listo en http://localhost:${PORT}`));
