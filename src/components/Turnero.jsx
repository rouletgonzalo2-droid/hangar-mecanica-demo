import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { fmtPrecio, fmtDiaLargo, fmtDiaPartes, fmtPatente, wa } from "../lib/negocio.js";
import SplitFlap from "./SplitFlap.jsx";
import { revEngine, checkeredFlags } from "./celebrate.js";

const PASOS = ["Vehículo", "Trabajo", "Día y hora", "Tus datos"];
const plateOk = (p) => /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{3}[A-Z]{3}|\d{3}[A-Z]{3})$/.test(p);
const phoneDigits = (s) => {
  let d = s.replace(/\D/g, "");
  if (d.startsWith("549")) d = d.slice(3); else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
  if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
  return d;
};
const ICONOS = {
  auto: "M6 30h52l-6-12c-1-2-3-3-5-3H17c-2 0-4 1-5 3zM6 30v9h6m40-9v9h6M18 39h28",
  camioneta: "M4 30h56v-6l-8-1-5-9H12l-3 9H4zM4 30v9h7m42-9v9h7M17 39h30",
  utilitario: "M4 34V14h34l10 8h10v12zM4 34v5h7m40-5v5h7M17 39h28",
  moto: "M10 38a7 7 0 1 0 0-.1M54 38a7 7 0 1 0 0-.1M17 38h14l8-12h8l7 12M27 24h10",
};

export default function Turnero({ cfg, seleccion, setSeleccion }) {
  const [paso, setPaso] = useState(0);
  const [v, setV] = useState({ tipo: "auto", marca: "", modelo: "", anio: "", patente: "", km: "" });
  const [sintoma, setSintoma] = useState("");
  const [cot, setCot] = useState(null);
  const [dias, setDias] = useState(null);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [datos, setDatos] = useState({ nombre: "", telefono: "" });
  const [err, setErr] = useState({});
  const [general, setGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState(null);
  const top = useRef(null);

  const cargarDias = () => api("/api/disponibilidad").then((d) => setDias(d.dias)).catch((e) => setGeneral(e.message));
  useEffect(() => { cargarDias(); }, []);

  // presupuesto orientativo calculado por el servidor
  useEffect(() => {
    const t = setTimeout(() => {
      const s = seleccion.length ? seleccion.join(",") : "diagnostico";
      api(`/api/turnos?cotizar=1&tipo=${v.tipo}&servicios=${encodeURIComponent(s)}`).then(setCot).catch(() => setCot(null));
    }, 220);
    return () => clearTimeout(t);
  }, [v.tipo, seleccion]);

  const toggle = (id) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const setF = (k) => (e) => setV((x) => ({ ...x, [k]: k === "patente" ? e.target.value.toUpperCase() : e.target.value }));

  const validar = (p) => {
    const e = {};
    if (p === 0) {
      if (!v.marca.trim()) e.marca = "Escribí la marca";
      if (!plateOk(v.patente.replace(/[^A-Z0-9]/g, ""))) e.patente = "Ej.: AB123CD o ABC123";
      if (v.anio && !(+v.anio >= 1960 && +v.anio <= new Date().getFullYear() + 1)) e.anio = "Revisá el año";
    }
    if (p === 1 && !seleccion.length && sintoma.trim().length < 4) e.trabajo = "Elegí un servicio o contanos qué le pasa";
    if (p === 2 && (!fecha || !hora)) e.hora = "Elegí el día y la hora de ingreso";
    if (p === 3) {
      if (datos.nombre.trim().length < 2) e.nombre = "Escribí tu nombre";
      if (phoneDigits(datos.telefono).length !== 10) e.telefono = "Código de área + número, sin 0 ni 15";
    }
    setErr(e);
    return !Object.keys(e).length;
  };
  const ir = (p) => {
    if (p > paso && !validar(paso)) return;
    setGeneral("");
    setPaso(p);
    top.current?.scrollIntoView({ block: "start" });
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    if (!validar(3)) return;
    setEnviando(true);
    setGeneral("");
    try {
      const r = await api("/api/turnos", {
        method: "POST",
        body: { ...v, servicios: seleccion, sintoma, fecha, hora, ...datos },
      });
      setRes(r);
      revEngine();
      checkeredFlags();
      setTimeout(() => top.current?.scrollIntoView({ block: "start" }), 30);
    } catch (e) {
      setGeneral(e.message);
      if (/horario/i.test(e.message)) { setHora(""); cargarDias(); setPaso(2); }
    } finally {
      setEnviando(false);
    }
  };

  const nuevo = () => {
    setRes(null); setPaso(0); setFecha(""); setHora(""); setSintoma(""); setSeleccion([]); cargarDias();
    setV({ tipo: "auto", marca: "", modelo: "", anio: "", patente: "", km: "" });
  };

  if (res) {
    const msg = `Hola Hangar, saqué turno por la web: ${res.codigo}. ${res.vehiculo.marca} ${res.vehiculo.modelo || ""} patente ${fmtPatente(res.patente)}, ingreso ${fmtDiaLargo(res.fecha)} a las ${res.hora}.`;
    return (
      <div className="pase" ref={top}>
        <div className="pase-head">
          <SplitFlap text="Turno confirmado" className="flap-xl" step={38} />
        </div>
        <div className="pase-body">
          <div className="pase-stub">
            <span className="k">Código</span>
            <strong className="pase-code">{res.codigo}</strong>
            <span className="k">Patente</span>
            <span className="placa">{fmtPatente(res.patente)}</span>
          </div>
          <dl className="pase-grid">
            <div><dt>Ingreso</dt><dd>{fmtDiaLargo(res.fecha)} · {res.hora} h</dd></div>
            <div><dt>Listo estimado</dt><dd>{fmtDiaLargo(res.listoEstimado)}</dd></div>
            <div><dt>Vehículo</dt><dd>{res.vehiculo.marca} {res.vehiculo.modelo} · {res.vehiculo.tipoNombre}</dd></div>
            <div><dt>Desde</dt><dd>{fmtPrecio(res.total)}</dd></div>
            <div className="span2"><dt>Trabajos</dt><dd>{res.lineas.map((l) => l.nombre).join(" · ")}</dd></div>
          </dl>
        </div>
        <p className="pase-note">El presupuesto final te lo confirmamos después de revisar el vehículo. Guardá el código: con la patente podés ver en qué estado está tu auto.</p>
        <div className="pase-actions">
          <a className="btn btn-primary" href={wa(msg)} target="_blank" rel="noopener">Avisar al taller por WhatsApp</a>
          <Link className="btn btn-ghost" to="/mi-auto" state={{ patente: res.patente }}>Seguir mi auto</Link>
          <button className="btn btn-text" type="button" onClick={nuevo}>Sacar otro turno</button>
        </div>
      </div>
    );
  }

  const dia = dias?.find((d) => d.fecha === fecha);

  return (
    <form className="turnero" onSubmit={enviar} noValidate ref={top}>
      <ol className="pasos" aria-label="Pasos del turno">
        {PASOS.map((p, i) => (
          <li key={p} className={i === paso ? "is-on" : i < paso ? "is-done" : ""}>
            <button type="button" onClick={() => i < paso && ir(i)} disabled={i > paso} aria-current={i === paso ? "step" : undefined}>
              <span className="pasos-n">{String(i + 1).padStart(2, "0")}</span>{p}
            </button>
          </li>
        ))}
      </ol>

      <div className="turnero-main">
        {paso === 0 && (
          <fieldset className="paso">
            <legend>¿Qué vehículo traés?</legend>
            <div className="tipos" role="radiogroup" aria-label="Tipo de vehículo">
              {cfg.tipos.map((t) => (
                <label key={t.id} className={"tipo" + (v.tipo === t.id ? " is-on" : "")}>
                  <input type="radio" name="tipo" value={t.id} checked={v.tipo === t.id} onChange={setF("tipo")} />
                  <svg viewBox="0 0 64 48" aria-hidden="true"><path d={ICONOS[t.id]} /></svg>
                  <span>{t.nombre}</span>
                </label>
              ))}
            </div>
            <div className="campos">
              <Campo label="Marca" error={err.marca}><input value={v.marca} onChange={setF("marca")} autoComplete="off" placeholder="Volkswagen" /></Campo>
              <Campo label="Modelo" opcional><input value={v.modelo} onChange={setF("modelo")} autoComplete="off" placeholder="Gol Trend" /></Campo>
              <Campo label="Año" opcional error={err.anio}><input value={v.anio} onChange={setF("anio")} inputMode="numeric" maxLength={4} placeholder="2018" /></Campo>
              <Campo label="Patente" error={err.patente}><input className="in-placa" value={v.patente} onChange={setF("patente")} maxLength={9} autoComplete="off" placeholder="AB 123 CD" /></Campo>
              <Campo label="Kilómetros" opcional><input value={v.km} onChange={setF("km")} inputMode="numeric" placeholder="85.000" /></Campo>
            </div>
          </fieldset>
        )}

        {paso === 1 && (
          <fieldset className="paso">
            <legend>¿Qué necesita?</legend>
            <div className="checks">
              {cfg.servicios.map((s) => (
                <label key={s.id} className={"check" + (seleccion.includes(s.id) ? " is-on" : "")}>
                  <input type="checkbox" checked={seleccion.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span className="check-box" aria-hidden="true" />
                  <span className="check-name">{s.nombre}</span>
                </label>
              ))}
            </div>
            <Campo label="¿Qué le pasa? Contanos con tus palabras" opcional={seleccion.length > 0} error={err.trabajo}>
              <textarea rows={3} value={sintoma} onChange={(e) => setSintoma(e.target.value)} maxLength={500}
                placeholder="Ej.: se prendió la luz del motor y tironea al acelerar en frío" />
            </Campo>
          </fieldset>
        )}

        {paso === 2 && (
          <fieldset className="paso">
            <legend>¿Cuándo lo traés?</legend>
            {!dias && <p className="cargando">Buscando lugares libres…</p>}
            {dias && (
              <>
                <div className="dias" role="radiogroup" aria-label="Día de ingreso">
                  {dias.map((d) => {
                    const p = fmtDiaPartes(d.fecha);
                    return (
                      <label key={d.fecha} className={"dia" + (fecha === d.fecha ? " is-on" : "") + (!d.libres ? " is-full" : "")}>
                        <input type="radio" name="fecha" value={d.fecha} disabled={!d.libres} checked={fecha === d.fecha}
                          onChange={() => { setFecha(d.fecha); setHora(""); }} />
                        <span className="dia-dow">{p.dow}</span>
                        <span className="dia-num">{p.num}</span>
                        <span className="dia-mes">{d.libres ? `${d.libres} lugares` : "completo"}</span>
                      </label>
                    );
                  })}
                </div>
                {dia && (
                  <div className="franjas" role="radiogroup" aria-label="Hora de ingreso">
                    {dia.franjas.map((f) => (
                      <label key={f.hora} className={"franja" + (hora === f.hora ? " is-on" : "")}>
                        <input type="radio" name="hora" value={f.hora} disabled={!f.ok} checked={hora === f.hora} onChange={() => setHora(f.hora)} />
                        <span className="franja-h">{f.hora}</span>
                        <span className="franja-l">{f.ok ? (f.libres === 1 ? "queda 1" : `${f.libres} libres`) : "ocupado"}</span>
                      </label>
                    ))}
                  </div>
                )}
                {err.hora && <p className="field-err" role="alert">{err.hora}</p>}
              </>
            )}
          </fieldset>
        )}

        {paso === 3 && (
          <fieldset className="paso">
            <legend>¿A quién le avisamos?</legend>
            <div className="campos">
              <Campo label="Nombre y apellido" error={err.nombre}><input value={datos.nombre} onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))} autoComplete="name" /></Campo>
              <Campo label="Celular (WhatsApp)" error={err.telefono}><input value={datos.telefono} onChange={(e) => setDatos((d) => ({ ...d, telefono: e.target.value }))} inputMode="tel" autoComplete="tel" placeholder="11 5555 1234" /></Campo>
            </div>
            <p className="aviso-datos">Usamos tu celular solo para avisarte el presupuesto y cuándo está listo.</p>
          </fieldset>
        )}

        {general && <p className="form-err" role="alert">{general}</p>}

        <div className="turnero-nav">
          {paso > 0 && <button type="button" className="btn btn-text" onClick={() => ir(paso - 1)}>Volver</button>}
          {paso < 3 ? (
            <button type="button" className="btn btn-primary" onClick={() => ir(paso + 1)}>Siguiente: {PASOS[paso + 1]}</button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? "Confirmando…" : "Confirmar turno"}</button>
          )}
        </div>
      </div>

      <aside className="resumen" aria-live="polite">
        <span className="k">Tu orden</span>
        <p className="resumen-veh">
          {v.marca ? `${v.marca} ${v.modelo}` : cfg.tipos.find((t) => t.id === v.tipo)?.nombre}
          {v.patente && <span className="placa placa-sm">{v.patente}</span>}
        </p>
        <ul className="resumen-lineas">
          {cot?.lineas.map((l) => (
            <li key={l.id}><span>{l.nombre}</span><span>{l.precio ? fmtPrecio(l.precio) : "sin cargo"}</span></li>
          ))}
        </ul>
        <div className="resumen-total"><span>Desde</span><strong>{cot ? fmtPrecio(cot.total) : "—"}</strong></div>
        {fecha && hora && <p className="resumen-cita">Ingreso: {fmtDiaLargo(fecha)} · {hora} h</p>}
        <p className="resumen-nota">Precio orientativo de mano de obra. Los repuestos y el presupuesto final se confirman después del diagnóstico.</p>
      </aside>
    </form>
  );
}

function Campo({ label, opcional, error, children }) {
  return (
    <label className={"campo" + (error ? " has-err" : "")}>
      <span className="campo-l">{label}{opcional && <em> · opcional</em>}</span>
      {children}
      {error && <span className="field-err" role="alert">{error}</span>}
    </label>
  );
}
