import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NEGOCIO, wa } from "../lib/negocio.js";

export function Marca({ small = false }) {
  return (
    <span className={"marca" + (small ? " is-small" : "")}>
      <span className="marca-h">HANGAR</span>
      <span className="marca-m">mecánica</span>
    </span>
  );
}

export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      <span className="demo-dot" aria-hidden="true" />
      Sitio de demostración hecho para {NEGOCIO.nombre} · fotos ilustrativas
    </div>
  );
}

const LINKS = [
  ["/#servicios", "Servicios"],
  ["/#diagnostico", "Diagnóstico"],
  ["/#flotas", "Flotas"],
  ["/mi-auto", "Mi auto"],
  ["/#contacto", "Contacto"],
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc]);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <header className={"nav" + (solid ? " is-solid" : "") + (open ? " is-open" : "")}>
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <div className="nav-in">
        <Link to="/" className="nav-logo" aria-label={NEGOCIO.nombre + ", inicio"}><Marca /></Link>
        <nav className="nav-links" aria-label="Principal">
          {LINKS.map(([to, label]) => <a key={to} href={to}>{label}</a>)}
        </nav>
        <a className="btn btn-primary nav-cta" href="/#turno">Sacar turno</a>
        <button className="nav-burger" aria-expanded={open} aria-controls="menu-movil" onClick={() => setOpen((o) => !o)}>
          <span className="sr">{open ? "Cerrar menú" : "Abrir menú"}</span>
          <i aria-hidden="true" /><i aria-hidden="true" />
        </button>
      </div>
      <div className="nav-sheet" id="menu-movil" hidden={!open}>
        {LINKS.map(([to, label], i) => <a key={to} href={to} style={{ "--i": i }}>{label}</a>)}
        <a className="btn btn-primary" href="/#turno" onClick={() => setOpen(false)}>Sacar turno</a>
        <a className="btn btn-ghost" href={wa("Hola Hangar, quería hacer una consulta.")} target="_blank" rel="noopener">Escribir por WhatsApp</a>
      </div>
    </header>
  );
}

export function MobileBar() {
  return (
    <div className="mobile-bar">
      <a className="btn btn-ghost" href={wa("Hola Hangar, quería hacer una consulta.")} target="_blank" rel="noopener">WhatsApp</a>
      <a className="btn btn-primary" href="/#turno">Sacar turno</a>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Marca />
          <p>Taller mecánico integral en Belén de Escobar. Representantes oficiales Bosch y MDQ Racing. Particulares, empresas, concesionarias y flotas.</p>
        </div>
        <div>
          <h3>Dónde</h3>
          <p>{NEGOCIO.direccion}<br />{NEGOCIO.localidad}</p>
          <a className="lnk" href={NEGOCIO.mapa} target="_blank" rel="noopener">Cómo llegar</a>
        </div>
        <div>
          <h3>Cuándo</h3>
          <p>{NEGOCIO.horario}<br />Sábados y domingos cerrado</p>
        </div>
        <div>
          <h3>Contacto</h3>
          <p>
            <a className="lnk" href={wa()} target="_blank" rel="noopener">WhatsApp {NEGOCIO.whatsappVisible}</a><br />
            <a className="lnk" href={"mailto:" + NEGOCIO.email}>{NEGOCIO.email}</a><br />
            <a className="lnk" href={NEGOCIO.instagram} target="_blank" rel="noopener">Instagram {NEGOCIO.instagramUser}</a><br />
            <a className="lnk" href={NEGOCIO.facebook} target="_blank" rel="noopener">Facebook</a>
          </p>
        </div>
      </div>
      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} {NEGOCIO.nombre}</span>
        <span>Fotos ilustrativas de Unsplash y video de Mixkit</span>
        <Link to="/admin" className="lnk">Torre de control</Link>
      </div>
    </footer>
  );
}
