export const NEGOCIO = {
  nombre: "Hangar Mecánica",
  direccion: "Av. Sarmiento 2085",
  localidad: "Belén de Escobar, Buenos Aires",
  horario: "Lunes a viernes de 9 a 18:30",
  horarioCorto: "Lun a vie · 9 a 18:30",
  whatsapp: "5491158735178",
  whatsappVisible: "11 5873-5178",
  email: "hangarboschservice@gmail.com",
  instagram: "https://www.instagram.com/hangarmecanica_/",
  instagramUser: "@hangarmecanica_",
  facebook: "https://www.facebook.com/hangarescobar",
  mapa: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Av. Sarmiento 2085, Belén de Escobar, Buenos Aires"),
  mapaEmbed: "https://maps.google.com/maps?q=" + encodeURIComponent("Av. Sarmiento 2085, Belén de Escobar, Buenos Aires") + "&z=16&output=embed",
};

export const wa = (texto = "") => `https://wa.me/${NEGOCIO.whatsapp}${texto ? "?text=" + encodeURIComponent(texto) : ""}`;

const U = (id, w = 1400) => `https://images.unsplash.com/photo-${id}?w=${w}&q=72&auto=format&fit=crop`;
export const img = U;

// Fotos ilustrativas (Unsplash) hasta que el taller pase las suyas
export const FOTOS = {
  hangar: "1727893119356-1702fe921cf9",
  diagnostico: "1791508725103-c0c3c4185721",
  inyeccion: "1486262715619-67b85e0b08d3",
  service: "1487754180451-c456f719a1fc",
  electricidad: "1625047509248-ec889cbff17f",
  mecanica: "1619642751034-765dfdf7c58e",
  suspension: "1760317890314-e964ffd7e6a6",
  alineacion: "1645445522156-9ac06bc7a767",
  optimizacion: "1747511578112-3d21e8b3d5d7",
  moto: "1762604462286-472334549804",
  flota: "1587813369290-091c9d432daf",
  frenos: "1696494561430-de087dd0bd69",
  motor: "1632733711679-529326f6db12",
  taller: "1771340012319-0b4fca008b54",
  camiones: "1565793298595-6a879b1d9492",
};

export const VIDEO_HERO = "https://assets.mixkit.co/videos/4716/4716-720.mp4";

export const fmtPrecio = (n) => "$" + Math.round(n).toLocaleString("es-AR");
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_L = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const d12 = (iso) => new Date(iso + "T12:00:00Z");
export const fmtDia = (iso) => { const d = d12(iso); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
export const fmtDiaLargo = (iso) => { const d = d12(iso); return `${DIAS_L[d.getUTCDay()]} ${d.getUTCDate()} de ${["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][d.getUTCMonth()]}`; };
export const fmtDiaPartes = (iso) => { const d = d12(iso); return { dow: DIAS[d.getUTCDay()], num: d.getUTCDate(), mes: MESES[d.getUTCMonth()] }; };
export const fmtPatente = (p = "") => (p.length === 7 ? `${p.slice(0, 2)} ${p.slice(2, 5)} ${p.slice(5)}` : p.length === 6 ? `${p.slice(0, 3)} ${p.slice(3)}` : p);
