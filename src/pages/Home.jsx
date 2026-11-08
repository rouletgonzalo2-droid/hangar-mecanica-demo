import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { NEGOCIO, FOTOS, VIDEO_HERO, img, wa, fmtPrecio, fmtDia } from "../lib/negocio.js";
import { useReveal } from "../lib/hooks.js";
import SplitFlap from "../components/SplitFlap.jsx";
import Scope from "../components/Scope.jsx";
import PhotoRail from "../components/PhotoRail.jsx";
import Turnero from "../components/Turnero.jsx";

const FOTO_SERVICIO = {
  diagnostico: [FOTOS.diagnostico, "Mecánico leyendo el diagnóstico en una computadora junto a un auto en el elevador"],
  inyeccion: [FOTOS.inyeccion, "Motor con el sistema de inyección a la vista"],
  service: [FOTOS.service, "Carga de aceite en el motor durante un service"],
  electricidad: [FOTOS.electricidad, "Mecánico revisando el vano motor y la batería"],
  mecanica: [FOTOS.mecanica, "Manos con una llave trabajando en el motor"],
  suspension: [FOTOS.suspension, "Disco y pinza de freno de una rueda delantera"],
  alineacion: [FOTOS.alineacion, "Mecánico trabajando sobre un neumático en el taller"],
  optimizacion: [FOTOS.optimizacion, "Componentes del motor durante una puesta a punto"],
};

const RAIL = [
  [FOTOS.hangar, "Taller amplio con autos sobre elevadores"],
  [FOTOS.motor, "Mecánico trabajando en el motor de un auto"],
  [FOTOS.frenos, "Primer plano de un freno de auto"],
  [FOTOS.moto, "Moto en reparación en el taller"],
  [FOTOS.taller, "Mecánico trabajando en el motor dentro del taller"],
  [FOTOS.camiones, "Camiones estacionados en fila"],
  [FOTOS.mecanica, "Manos con grasa ajustando una pieza del motor"],
];

function SplitText({ text, delay = 0, className = "" }) {
  let i = 0;
  return (
    <span className={"st " + className} aria-hidden="true">
      {text.split(" ").map((w, k, all) => (
        <span key={k}>
          <span className="st-w">
            {[...w].map((c) => <span className="st-c" key={i} style={{ "--d": `${delay + (i++) * 28}ms` }}>{c}</span>)}
          </span>
          {k < all.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

export default function Home() {
  const [cfg, setCfg] = useState(null);
  const [proximo, setProximo] = useState(null);
  const [seleccion, setSeleccion] = useState([]);
  const [activo, setActivo] = useState("diagnostico");
  const [abierto, setAbierto] = useState(false);
  const hangarRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api("/api/config").then(setCfg).catch(() => {});
    api("/api/disponibilidad").then(({ dias }) => {
      for (const d of dias) {
        const f = d.franjas.find((x) => x.ok);
        if (f) return setProximo({ fecha: d.fecha, hora: f.hora });
      }
      setProximo(false);
    }).catch(() => setProximo(false));
    if (window.location.hash) setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 120);
    // el portón sube cuando el hangar entra en pantalla (en el celular está debajo del título)
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setAbierto(true); io.disconnect(); } }, { threshold: 0.35 });
    if (hangarRef.current) io.observe(hangarRef.current);
    return () => io.disconnect();
  }, []);

  const sumar = (id) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const irAlTurno = (id) => {
    if (id) setSeleccion((s) => (s.includes(id) ? s : [...s, id]));
    document.getElementById("turno")?.scrollIntoView({ behavior: "smooth" });
  };

  const rServ = useReveal();
  const rDiag = useReveal();
  const rFlota = useReveal();
  const rCont = useReveal();

  return (
    <main id="contenido">
      {/* ---------- HERO ---------- */}
      <section className="hero" aria-labelledby="h1">
        <div className="hero-grid">
          <div className="hero-copy">
            {cfg?.aviso && <p className="aviso-web" role="note">{cfg.aviso}</p>}
            <p className="eyebrow"><span className="sq" aria-hidden="true" />Bosch Car Service · MDQ Racing</p>
            <h1 id="h1" aria-label="Taller mecánico en Belén de Escobar">
              <SplitText text="Taller mecánico en" delay={200} />
              <span className="hl"><SplitText text="Belén de Escobar" delay={720} /></span>
            </h1>
            <p className="hero-sub">
              Mecánica integral, inyección electrónica y electricidad para autos, camionetas, motos y flotas.
              Más de 10 años en Av. Sarmiento, con el aval oficial de Bosch.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary btn-lg" href="#turno">Sacar turno</a>
              <a className="btn btn-ghost btn-lg" href={wa("Hola Hangar, quería hacer una consulta.")} target="_blank" rel="noopener">Escribir por WhatsApp</a>
            </div>
            <ul className="hero-facts">
              <li><span className="k">Horario</span>{NEGOCIO.horarioCorto}</li>
              <li><span className="k">Dirección</span>{NEGOCIO.direccion}, Escobar</li>
            </ul>
          </div>

          <div className={"hangar" + (abierto ? " is-open" : "")} ref={hangarRef}>
            <span className="hangar-stencil" aria-hidden="true">HANGAR 01</span>
            <div className="hangar-frame">
              <video className="hangar-video" src={VIDEO_HERO} poster={img(FOTOS.motor, 1200)} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
              <div className="hangar-door" aria-hidden="true"><span>HANGAR</span></div>
              <span className="hangar-light" aria-hidden="true" />
            </div>
            <div className="hangar-floor" aria-hidden="true" />
          </div>
        </div>

        <div className="board" aria-live="polite">
          <div className="board-cell board-label">Próximo ingreso libre</div>
          <div className="board-cell">
            {proximo ? <SplitFlap text={fmtDia(proximo.fecha)} delay={900} /> : <span className="board-wait">{proximo === false ? "CONSULTAR" : "· · ·"}</span>}
          </div>
          <div className="board-cell">
            {proximo ? <SplitFlap text={proximo.hora.replace(":", " ")} delay={1300} /> : <span className="board-wait">· · ·</span>}
          </div>
          <div className="board-cell board-state">
            <span className={"led" + (proximo ? " is-ok" : "")} aria-hidden="true" />
            {proximo ? "Disponible" : proximo === false ? "Escribinos" : "Buscando"}
          </div>
          <a className="board-cell board-go" href="#turno">Reservar este lugar<span aria-hidden="true">→</span></a>
        </div>
      </section>

      {/* ---------- SERVICIOS: checklist de pre-vuelo ---------- */}
      <section className="sec servicios" id="servicios" aria-labelledby="h-serv" ref={rServ}>
        <div className="wrap">
          <header className="sec-head">
            <span className="sec-num" aria-hidden="true">01</span>
            <h2 id="h-serv">Servicios del taller, como una lista de chequeo</h2>
            <p className="sec-lead">Tildá lo que necesita tu vehículo y pasa directo al turno con el precio orientativo.</p>
          </header>
          <div className="checklist">
            <div className="checklist-photo" aria-hidden="true">
              {Object.entries(FOTO_SERVICIO).map(([id, [foto, alt]]) => (
                <img key={id} src={img(foto, 1000)} alt={alt} loading="lazy" className={activo === id ? "is-on" : ""} />
              ))}
              <span className="checklist-badge">{String((cfg?.servicios.findIndex((s) => s.id === activo) ?? 0) + 1).padStart(2, "0")}</span>
            </div>
            <ol className="checklist-list">
              {(cfg?.servicios || []).map((s, i) => {
                const on = seleccion.includes(s.id);
                return (
                  <li key={s.id} className={(activo === s.id ? "is-active " : "") + (on ? "is-checked" : "")}
                    onMouseEnter={() => setActivo(s.id)} onFocus={() => setActivo(s.id)}>
                    <span className="cl-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                    <div className="cl-body">
                      <h3>{s.nombre}</h3>
                      <p>{s.detalle}</p>
                    </div>
                    <span className="cl-price">desde {fmtPrecio(s.desde)}</span>
                    <button type="button" className={"cl-check" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => { sumar(s.id); setActivo(s.id); }}>
                      <span className="cl-box" aria-hidden="true" />{on ? "En el turno" : "Sumar al turno"}
                    </button>
                  </li>
                );
              })}
              <li className="cl-motos">
                <span className="cl-n" aria-hidden="true">+</span>
                <div className="cl-body">
                  <h3>Motos</h3>
                  <p>Service, electricidad y mecánica de motos. Elegí “Moto” al sacar el turno.</p>
                </div>
              </li>
            </ol>
          </div>
          <div className={"checklist-bar" + (seleccion.length ? " is-on" : "")} aria-live="polite">
            <span>{seleccion.length} {seleccion.length === 1 ? "servicio tildado" : "servicios tildados"}</span>
            <a className="btn btn-primary" href="#turno">Seguir con el turno</a>
          </div>
        </div>
      </section>

      {/* ---------- DIAGNÓSTICO con osciloscopio ---------- */}
      <section className="sec diag" id="diagnostico" aria-labelledby="h-diag" ref={rDiag}>
        <Scope />
        <div className="wrap diag-grid">
          <header className="sec-head">
            <span className="sec-num" aria-hidden="true">02</span>
            <h2 id="h-diag">Diagnóstico computarizado: lo que el auto no te dice</h2>
          </header>
          <div className="diag-copy">
            <p>
              Con el equipo de diagnóstico Bosch leemos la computadora del vehículo: fallas guardadas, sensores,
              inyectores y encendido. Sabés qué tiene antes de gastar en repuestos, y si además hacés el trabajo con
              nosotros, el escaneo va bonificado.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => irAlTurno("diagnostico")}>Pedir un diagnóstico</button>
          </div>
          <dl className="diag-specs">
            <div><dt>Bosch</dt><dd>Representantes oficiales: equipos, repuestos y garantía de marca.</dd></div>
            <div><dt>MDQ Racing</dt><dd>Optimización electrónica: más respuesta y mejor consumo.</dd></div>
            <div><dt>+10 años</dt><dd>Particulares, empresas y concesionarias de la zona.</dd></div>
          </dl>
        </div>
      </section>

      {/* ---------- RIEL ---------- */}
      <section className="sec taller" id="taller" aria-labelledby="h-taller">
        <div className="wrap">
          <header className="sec-head sec-head-row">
            <span className="sec-num" aria-hidden="true">03</span>
            <h2 id="h-taller">Adentro del hangar</h2>
            <p className="sec-lead">Elevadores, motores abiertos y motos esperando su vuelta a la calle.</p>
          </header>
        </div>
        <PhotoRail fotos={RAIL} />
      </section>

      {/* ---------- FLOTAS ---------- */}
      <section className="sec flotas" id="flotas" aria-labelledby="h-flota" ref={rFlota}>
        <div className="wrap flotas-grid">
          <div className="flotas-copy">
            <header className="sec-head">
              <span className="sec-num" aria-hidden="true">04</span>
              <h2 id="h-flota">Mantenimiento de flotas para empresas</h2>
            </header>
            <p>
              Camiones, utilitarios, camionetas, autos y motos de empresas y concesionarias. Armamos un plan de
              mantenimiento por kilómetros, con historial de cada unidad y prioridad para que la flota no se quede parada.
            </p>
            <figure className="flotas-photo">
              <img src={img(FOTOS.flota, 1100)} alt="Fila de utilitarios blancos estacionados" loading="lazy" />
            </figure>
          </div>
          <FlotaForm />
        </div>
      </section>

      {/* ---------- TURNO ---------- */}
      <section className="sec turno" id="turno" aria-labelledby="h-turno">
        <div className="wrap">
          <header className="sec-head sec-head-row">
            <span className="sec-num" aria-hidden="true">05</span>
            <h2 id="h-turno">Sacá turno de ingreso para tu vehículo</h2>
            <p className="sec-lead">Elegís el día y la hora; el lugar se descuenta en el momento.</p>
          </header>
          {cfg ? <Turnero cfg={cfg} seleccion={seleccion} setSeleccion={setSeleccion} /> : <p className="cargando">Cargando el turnero…</p>}
        </div>
      </section>

      {/* ---------- CONTACTO + MI AUTO ---------- */}
      <section className="sec contacto" id="contacto" aria-labelledby="h-cont" ref={rCont}>
        <div className="wrap contacto-grid">
          <div className="contacto-info">
            <header className="sec-head">
              <span className="sec-num" aria-hidden="true">06</span>
              <h2 id="h-cont">Dónde queda el hangar</h2>
            </header>
            <p className="contacto-dir">{NEGOCIO.direccion}<br />{NEGOCIO.localidad}</p>
            <p className="contacto-hor">{NEGOCIO.horario}. Sábados y domingos cerrado.</p>
            <div className="contacto-ctas">
              <a className="btn btn-primary" href={NEGOCIO.mapa} target="_blank" rel="noopener">Cómo llegar</a>
              <a className="btn btn-ghost" href={wa("Hola Hangar, quería hacer una consulta.")} target="_blank" rel="noopener">WhatsApp {NEGOCIO.whatsappVisible}</a>
            </div>
            <p className="contacto-redes">
              <a className="lnk" href={NEGOCIO.instagram} target="_blank" rel="noopener">Instagram</a>
              <a className="lnk" href={NEGOCIO.facebook} target="_blank" rel="noopener">Facebook</a>
              <a className="lnk" href={"mailto:" + NEGOCIO.email}>Email</a>
            </p>
            <MiAutoMini onGo={(state) => navigate("/mi-auto", { state })} />
          </div>
          <div className="mapa">
            <iframe title="Mapa: Hangar Mecánica en Av. Sarmiento 2085, Belén de Escobar" src={NEGOCIO.mapaEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>
    </main>
  );
}

function MiAutoMini({ onGo }) {
  const [patente, setPatente] = useState("");
  const [tel4, setTel4] = useState("");
  return (
    <form className="mini" onSubmit={(e) => { e.preventDefault(); onGo({ patente, tel4 }); }}>
      <p className="mini-t"><strong>¿Ya dejaste el auto?</strong> Mirá en qué estado está.</p>
      <div className="mini-row">
        <label className="campo"><span className="campo-l">Patente</span>
          <input className="in-placa" value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())} maxLength={9} placeholder="AB 123 CD" />
        </label>
        <label className="campo"><span className="campo-l">Últimos 4 del celular</span>
          <input value={tel4} onChange={(e) => setTel4(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1234" />
        </label>
        <button className="btn btn-dark" type="submit">Ver mi auto</button>
      </div>
    </form>
  );
}

const TIPOS_FLOTA = [["camion", "Camiones"], ["utilitario", "Utilitarios"], ["camioneta", "Camionetas"], ["auto", "Autos"], ["moto", "Motos"]];

function FlotaForm() {
  const [f, setF] = useState({ empresa: "", contacto: "", telefono: "", email: "", cantidad: "", tipos: [], mensaje: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [env, setEnv] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const ref = useRef(null);
  const enviar = async (e) => {
    e.preventDefault();
    setErr("");
    if (!f.empresa.trim() || !f.contacto.trim() || !f.telefono.trim() || !f.cantidad || !f.tipos.length) {
      setErr("Completá empresa, contacto, celular, cantidad y tipo de vehículos.");
      return;
    }
    setEnv(true);
    try {
      await api("/api/flotas", { method: "POST", body: { ...f, cantidad: Number(f.cantidad) } });
      setOk(true);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setEnv(false);
    }
  };
  if (ok) {
    return (
      <div className="manifiesto manifiesto-ok" ref={ref}>
        <span className="k">Pedido recibido</span>
        <p className="manifiesto-ok-t">Gracias, {f.contacto.split(" ")[0]}. Te escribimos al celular para armar la propuesta para {f.empresa}.</p>
        <a className="btn btn-ghost" href={wa(`Hola Hangar, les dejé un pedido de flota para ${f.empresa} (${f.cantidad} vehículos).`)} target="_blank" rel="noopener">Escribir ahora por WhatsApp</a>
      </div>
    );
  }
  return (
    <form className="manifiesto" onSubmit={enviar} noValidate>
      <div className="manifiesto-head"><span className="k">Manifiesto de flota</span><span className="k">FL-—</span></div>
      <div className="campos">
        <label className="campo"><span className="campo-l">Empresa</span><input value={f.empresa} onChange={set("empresa")} autoComplete="organization" /></label>
        <label className="campo"><span className="campo-l">Contacto</span><input value={f.contacto} onChange={set("contacto")} autoComplete="name" /></label>
        <label className="campo"><span className="campo-l">Celular</span><input value={f.telefono} onChange={set("telefono")} inputMode="tel" autoComplete="tel" /></label>
        <label className="campo"><span className="campo-l">Email <em>· opcional</em></span><input value={f.email} onChange={set("email")} type="email" autoComplete="email" /></label>
        <label className="campo"><span className="campo-l">Cantidad de vehículos</span><input value={f.cantidad} onChange={(e) => setF((x) => ({ ...x, cantidad: e.target.value.replace(/\D/g, "").slice(0, 3) }))} inputMode="numeric" /></label>
      </div>
      <fieldset className="chips">
        <legend className="campo-l">Tipo de vehículos</legend>
        {TIPOS_FLOTA.map(([id, label]) => (
          <label key={id} className={"chip" + (f.tipos.includes(id) ? " is-on" : "")}>
            <input type="checkbox" checked={f.tipos.includes(id)} onChange={() => setF((x) => ({ ...x, tipos: x.tipos.includes(id) ? x.tipos.filter((t) => t !== id) : [...x.tipos, id] }))} />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="campo"><span className="campo-l">¿Qué necesitan? <em>· opcional</em></span><textarea rows={3} value={f.mensaje} onChange={set("mensaje")} maxLength={600} placeholder="Ej.: service cada 10.000 km para 8 utilitarios" /></label>
      {err && <p className="form-err" role="alert">{err}</p>}
      <button className="btn btn-primary" type="submit" disabled={env}>{env ? "Enviando…" : "Pedir propuesta para la flota"}</button>
    </form>
  );
}
