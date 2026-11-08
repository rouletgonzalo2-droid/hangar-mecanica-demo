import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { fmtPrecio, fmtDia, fmtDiaLargo, fmtPatente } from "../lib/negocio.js";
import "./admin.css";

const TK = "hangar-torre";
const getTok = () => { try { return sessionStorage.getItem(TK) || ""; } catch { return ""; } };
const setTok = (t) => { try { t ? sessionStorage.setItem(TK, t) : sessionStorage.removeItem(TK); } catch { /* sin storage */ } };
const waCliente = (tel, txt) => `https://wa.me/549${tel}?text=${encodeURIComponent(txt)}`;
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diasEntre = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5);
const EN_PLATAFORMA = ["recibido", "diagnostico", "presupuesto", "aprobado", "repuesto", "reparacion"];
const TABS = [["torre", "Torre"], ["agenda", "Agenda"], ["vehiculos", "Vehículos"], ["recordatorios", "Recordatorios"], ["flotas", "Flotas"], ["ajustes", "Ajustes"]];

export default function Admin() {
  const [tok, setT] = useState(getTok);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("torre");
  const [abierta, setAbierta] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    document.title = "Torre de control · Hangar Mecánica";
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  const salir = useCallback(() => { setTok(""); setT(""); setData(null); }, []);
  const cargar = useCallback(async () => {
    try {
      setData(await api("/api/admin/ordenes", { token: tok }));
      setErr("");
    } catch (e) {
      if (e.status === 401) salir(); else setErr(e.message);
    }
  }, [tok, salir]);
  useEffect(() => { if (tok) cargar(); }, [tok, cargar]);
  useEffect(() => {
    if (!tok) return;
    const t = setInterval(() => !document.hidden && cargar(), 45000);
    return () => clearInterval(t);
  }, [tok, cargar]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  const patch = async (codigo, cambios, msg) => {
    const r = await api("/api/admin/ordenes", { method: "PATCH", token: tok, body: { codigo, cambios } });
    setData((d) => ({ ...d, ordenes: d.ordenes.map((o) => (o.codigo === codigo ? r.orden : o)) }));
    setToast(msg || r.mensaje);
    return r.orden;
  };

  if (!tok) return <Login onOk={(t) => { setTok(t); setT(t); }} />;
  if (!data) return <div className="torre torre-load"><p>{err || "Conectando con la torre…"}</p></div>;

  const orden = abierta && data.ordenes.find((o) => o.codigo === abierta);

  return (
    <div className="torre">
      <header className="t-top">
        <div className="t-brand">
          <span className="t-stencil">HANGAR</span>
          <span className="t-sub">Torre de control</span>
        </div>
        <Reloj />
        <div className="t-top-actions">
          <button className="t-btn t-btn-hot" onClick={() => setNuevo(true)}>+ Nuevo ingreso</button>
          <Link className="t-btn" to="/">Ver la web</Link>
          <button className="t-btn" onClick={salir}>Salir</button>
        </div>
      </header>

      <nav className="t-tabs" aria-label="Secciones del panel">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "is-on" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      <main className="t-main">
        {err && <p className="t-err" role="alert">{err}</p>}
        {tab === "torre" && <Torre data={data} abrir={setAbierta} />}
        {tab === "agenda" && <Agenda data={data} abrir={setAbierta} />}
        {tab === "vehiculos" && <Vehiculos data={data} abrir={setAbierta} />}
        {tab === "recordatorios" && <Recordatorios data={data} patch={patch} />}
        {tab === "flotas" && <Flotas tok={tok} setToast={setToast} />}
        {tab === "ajustes" && <Ajustes tok={tok} data={data} setData={setData} setToast={setToast} recargar={cargar} />}
      </main>

      {orden && <OrdenTrabajo o={orden} data={data} patch={patch} cerrar={() => setAbierta(null)} />}
      {nuevo && <NuevoIngreso data={data} tok={tok} cerrar={() => setNuevo(false)} onOk={(o) => { setNuevo(false); setData((d) => ({ ...d, ordenes: [...d.ordenes, o] })); setToast(`Ingresó ${fmtPatente(o.patente)}`); setAbierta(o.codigo); }} />}
      <div className={"t-toast" + (toast ? " is-on" : "")} role="status">{toast}</div>
    </div>
  );
}

/* ---------------- login ---------------- */
function Login({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [env, setEnv] = useState(false);
  const entrar = async (e) => {
    e.preventDefault();
    setEnv(true); setErr("");
    try { onOk((await api("/api/admin/login", { method: "POST", body: { password: pw } })).token); }
    catch (e2) { setErr(e2.message); }
    finally { setEnv(false); }
  };
  return (
    <div className="torre t-login">
      <form className="t-login-card" onSubmit={entrar}>
        <span className="t-stencil">HANGAR</span>
        <h1>Torre de control</h1>
        <p>Turnos, boxes, presupuestos y avisos del taller.</p>
        <label className="t-field"><span>Clave del taller</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus />
        </label>
        {err && <p className="t-err" role="alert">{err}</p>}
        <button className="t-btn t-btn-hot t-btn-lg" disabled={env || !pw}>{env ? "Entrando…" : "Entrar"}</button>
        <Link className="t-link" to="/">Volver a la web</Link>
      </form>
    </div>
  );
}

function Reloj() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  const hh = t.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" });
  const dd = t.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
  return <div className="t-clock"><strong>{hh}</strong><span>{dd}</span></div>;
}

const Placa = ({ p }) => <span className="t-placa">{fmtPatente(p)}</span>;
const Pill = ({ estado, estados }) => <span className={"t-pill is-" + estado}>{estados.find((e) => e.id === estado)?.vuelo || estado}</span>;

/* ---------------- avisos ---------------- */
function avisos(data) {
  const { ordenes, hoy } = data;
  const ult = (o) => (o.historial.at(-1)?.at || o.creada).slice(0, 10);
  const out = [];
  const llegan = ordenes.filter((o) => o.estado === "reservado" && o.fecha === hoy);
  if (llegan.length) out.push({ tipo: "info", txt: `${llegan.length} ${llegan.length === 1 ? "vehículo entra" : "vehículos entran"} hoy`, det: llegan.map((o) => `${o.hora} ${fmtPatente(o.patente)}`).join(" · ") });
  const faltaron = ordenes.filter((o) => o.estado === "reservado" && o.fecha < hoy);
  if (faltaron.length) out.push({ tipo: "warn", txt: `${faltaron.length} turno${faltaron.length > 1 ? "s" : ""} pasado${faltaron.length > 1 ? "s" : ""} sin ingreso`, det: faltaron.map((o) => fmtPatente(o.patente)).join(" · ") });
  const demorados = ordenes.filter((o) => o.estado === "repuesto" && diasEntre(ult(o), hoy) >= 2);
  if (demorados.length) out.push({ tipo: "warn", txt: `${demorados.length} esperando repuesto hace 2 días o más`, det: demorados.map((o) => fmtPatente(o.patente)).join(" · ") });
  const presu = ordenes.filter((o) => o.estado === "presupuesto" && diasEntre(ult(o), hoy) >= 1);
  if (presu.length) out.push({ tipo: "warn", txt: `${presu.length} presupuesto${presu.length > 1 ? "s" : ""} sin respuesta`, det: presu.map((o) => fmtPatente(o.patente)).join(" · ") });
  const listos = ordenes.filter((o) => o.estado === "listo");
  if (listos.length) out.push({ tipo: "ok", txt: `${listos.length} listo${listos.length > 1 ? "s" : ""} para retirar`, det: listos.map((o) => fmtPatente(o.patente)).join(" · ") });
  const rec = recordatorios(data).filter((r) => !r.avisado && r.dias <= 15);
  if (rec.length) out.push({ tipo: "info", txt: `${rec.length} cliente${rec.length > 1 ? "s" : ""} para avisar del service`, det: rec.map((r) => fmtPatente(r.patente)).join(" · ") });
  return out;
}

/* ---------------- torre ---------------- */
function Torre({ data, abrir }) {
  const { ordenes, hoy, estados, config } = data;
  // si hoy no se trabaja, la columna de arribos muestra el próximo día con turnos
  const proxDia = ordenes.filter((o) => o.estado === "reservado" && o.fecha >= hoy).map((o) => o.fecha).sort()[0] || hoy;
  const arribos = ordenes.filter((o) => o.estado === "reservado" && o.fecha === proxDia).sort((a, b) => (a.hora < b.hora ? -1 : 1));
  const plataforma = ordenes.filter((o) => EN_PLATAFORMA.includes(o.estado)).sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? -1 : 1));
  const partidas = ordenes.filter((o) => o.estado === "listo");
  const av = avisos(data);
  const boxes = Array.from({ length: config.boxes }, (_, i) => ordenes.find((o) => o.box === i + 1));

  const Fila = ({ o, info }) => (
    <button className="t-row" onClick={() => abrir(o.codigo)}>
      <span className="t-row-h">{info}</span>
      <Placa p={o.patente} />
      <span className="t-row-v">{o.vehiculo.marca} {o.vehiculo.modelo}<em>{o.nombre}</em></span>
      <Pill estado={o.estado} estados={estados} />
    </button>
  );

  return (
    <>
      <section className="t-avisos" aria-label="Avisos">
        {av.length === 0 && <p className="t-aviso is-ok"><strong>Todo en orden.</strong> No hay pendientes urgentes.</p>}
        {av.map((a, i) => <p key={i} className={"t-aviso is-" + a.tipo}><strong>{a.txt}</strong><span>{a.det}</span></p>)}
      </section>

      <section className="t-boxes" aria-label="Boxes del taller">
        {boxes.map((o, i) => (
          <button key={i} className={"t-box" + (o ? " is-busy" : "")} onClick={() => o && abrir(o.codigo)} disabled={!o}>
            <span className="t-box-n">BOX {String(i + 1).padStart(2, "0")}</span>
            {o ? (<><Placa p={o.patente} /><span className="t-box-v">{o.vehiculo.marca} {o.vehiculo.modelo}</span><Pill estado={o.estado} estados={estados} /></>) : <span className="t-box-free">LIBRE</span>}
          </button>
        ))}
      </section>

      <section className="t-fids">
        <div className="t-fid">
          <h2><span>Arribos</span><em>{proxDia === hoy ? "hoy" : fmtDia(proxDia)}</em><b>{arribos.length}</b></h2>
          {arribos.length ? arribos.map((o) => <Fila key={o.codigo} o={o} info={o.hora} />) : <p className="t-empty">Sin turnos reservados.</p>}
        </div>
        <div className="t-fid">
          <h2><span>En plataforma</span><b>{plataforma.length}</b></h2>
          {plataforma.length ? plataforma.map((o) => <Fila key={o.codigo} o={o} info={o.box ? `B${o.box}` : "—"} />) : <p className="t-empty">No hay vehículos en el taller.</p>}
        </div>
        <div className="t-fid">
          <h2><span>Partidas</span><em>listos</em><b>{partidas.length}</b></h2>
          {partidas.length ? partidas.map((o) => <Fila key={o.codigo} o={o} info="LISTO" />) : <p className="t-empty">Nada para retirar.</p>}
        </div>
      </section>
    </>
  );
}

/* ---------------- agenda ---------------- */
function Agenda({ data, abrir }) {
  const { disponibilidad, ordenes, config } = data;
  return (
    <section className="t-agenda">
      <p className="t-hint">Próximos días hábiles · {config.cupoFranja} vehículos por franja · máximo {config.cupoDia} ingresos por día. Los días cerrados se marcan en Ajustes.</p>
      <div className="t-agenda-scroll">
        <table className="t-table t-agenda-t">
          <thead>
            <tr><th scope="col">Hora</th>{disponibilidad.map((d) => <th scope="col" key={d.fecha}>{fmtDia(d.fecha)}<small>{d.libres} libres</small></th>)}</tr>
          </thead>
          <tbody>
            {config.franjas.map((h) => (
              <tr key={h}>
                <th scope="row">{h}</th>
                {disponibilidad.map((d) => {
                  const os = ordenes.filter((o) => o.fecha === d.fecha && o.hora === h && o.estado !== "cancelado");
                  return (
                    <td key={d.fecha} className={os.length >= config.cupoFranja ? "is-full" : ""}>
                      {os.map((o) => <button key={o.codigo} className="t-chip" onClick={() => abrir(o.codigo)}>{fmtPatente(o.patente)}</button>)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- vehículos ---------------- */
function Vehiculos({ data, abrir }) {
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const m = new Map();
    for (const o of data.ordenes) {
      if (o.estado === "cancelado") continue;
      const v = m.get(o.patente) || { patente: o.patente, vehiculo: o.vehiculo, nombre: o.nombre, telefono: o.telefono, ordenes: [] };
      v.ordenes.push(o);
      m.set(o.patente, v);
    }
    const s = q.trim().toUpperCase().replace(/\s/g, "");
    return [...m.values()]
      .map((v) => ({ ...v, ordenes: v.ordenes.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) }))
      .filter((v) => !s || v.patente.includes(s) || v.nombre.toUpperCase().replace(/\s/g, "").includes(s) || (v.vehiculo.marca + v.vehiculo.modelo).toUpperCase().replace(/\s/g, "").includes(s))
      .sort((a, b) => (a.ordenes[0].fecha < b.ordenes[0].fecha ? 1 : -1));
  }, [data.ordenes, q]);
  return (
    <section>
      <label className="t-field t-search"><span>Buscar por patente, cliente o modelo</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="AE482KD, Aguirre, Hilux…" />
      </label>
      <div className="t-cards">
        {lista.map((v) => {
          const prox = v.ordenes.find((o) => o.proximoService)?.proximoService;
          return (
            <article className="t-veh" key={v.patente}>
              <header><Placa p={v.patente} /><strong>{v.vehiculo.marca} {v.vehiculo.modelo} {v.vehiculo.anio || ""}</strong></header>
              <p className="t-veh-c">{v.nombre} · <a href={waCliente(v.telefono, `Hola ${v.nombre.split(" ")[0]}, te escribimos de Hangar Mecánica.`)} target="_blank" rel="noopener">WhatsApp</a></p>
              {prox && <p className="t-veh-next">Próximo service: {fmtDia(prox.fecha)}{prox.km ? ` o ${prox.km.toLocaleString("es-AR")} km` : ""}</p>}
              <ol className="t-veh-h">
                {v.ordenes.map((o) => (
                  <li key={o.codigo}>
                    <button onClick={() => abrir(o.codigo)}>
                      <span>{fmtDia(o.fecha)}</span>
                      <span>{(o.presupuesto.length ? o.presupuesto.map((p) => p.desc) : o.estimado.lineas.map((l) => l.nombre)).join(", ")}</span>
                      <span>{o.km ? o.km.toLocaleString("es-AR") + " km" : ""}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
        {!lista.length && <p className="t-empty">No hay vehículos con esa búsqueda.</p>}
      </div>
    </section>
  );
}

/* ---------------- recordatorios de service ---------------- */
function recordatorios(data) {
  const { ordenes, hoy } = data;
  const porPatente = new Map();
  for (const o of ordenes) if (o.estado !== "cancelado") (porPatente.get(o.patente) || porPatente.set(o.patente, []).get(o.patente)).push(o);
  const out = [];
  for (const [patente, os] of porPatente) {
    const con = os.filter((o) => o.proximoService && o.estado === "entregado").sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
    if (!con) continue;
    // si ya volvió después, no hace falta avisar
    if (os.some((o) => o.fecha > con.fecha && o.estado !== "cancelado")) continue;
    const dias = diasEntre(hoy, con.proximoService.fecha);
    if (dias > 45) continue;
    out.push({ patente, o: con, dias, avisado: con.avisadoService });
  }
  return out.sort((a, b) => a.dias - b.dias);
}

function Recordatorios({ data, patch }) {
  const lista = recordatorios(data);
  return (
    <section>
      <p className="t-hint">Vehículos con el service vencido o por vencer en los próximos 45 días. Un toque abre WhatsApp con el mensaje listo; después marcalo como avisado.</p>
      <div className="t-list">
        {lista.map(({ patente, o, dias, avisado }) => {
          const n = o.nombre.split(" ")[0];
          const txt = `Hola ${n}, te escribimos de Hangar Mecánica. A tu ${o.vehiculo.marca} ${o.vehiculo.modelo} (${fmtPatente(patente)}) le toca el service ${dias < 0 ? "desde el " + fmtDiaLargo(o.proximoService.fecha) : "el " + fmtDiaLargo(o.proximoService.fecha)}${o.proximoService.km ? ` o a los ${o.proximoService.km.toLocaleString("es-AR")} km` : ""}. ¿Te reservamos un turno? Podés sacarlo también desde la web.`;
          return (
            <article key={patente} className={"t-rec" + (avisado ? " is-done" : "") + (dias < 0 ? " is-late" : "")}>
              <Placa p={patente} />
              <div className="t-rec-b">
                <strong>{o.nombre} · {o.vehiculo.marca} {o.vehiculo.modelo}</strong>
                <span>{dias < 0 ? `Vencido hace ${-dias} días` : dias === 0 ? "Vence hoy" : `Vence en ${dias} días`} · {fmtDia(o.proximoService.fecha)}{o.proximoService.km ? ` · ${o.proximoService.km.toLocaleString("es-AR")} km` : ""}</span>
                {avisado && <em>Avisado el {fmtDia(avisado)}</em>}
              </div>
              <a className="t-btn t-btn-wa" href={waCliente(o.telefono, txt)} target="_blank" rel="noopener">WhatsApp</a>
              <button className="t-btn" onClick={() => patch(o.codigo, { avisadoService: avisado ? null : data.hoy }, avisado ? "Aviso desmarcado" : `${fmtPatente(patente)} marcado como avisado`)}>{avisado ? "Desmarcar" : "Marcar avisado"}</button>
            </article>
          );
        })}
        {!lista.length && <p className="t-empty">No hay services por vencer este mes.</p>}
      </div>
    </section>
  );
}

/* ---------------- flotas ---------------- */
function Flotas({ tok, setToast }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/admin/flotas", { token: tok }).then(setD).catch((e) => setErr(e.message)); }, [tok]);
  const cambiar = async (id, estado) => {
    try {
      const r = await api("/api/admin/flotas", { method: "PATCH", token: tok, body: { id, estado } });
      setD((x) => ({ ...x, flotas: x.flotas.map((f) => (f.id === id ? r.flota : f)) }));
      setToast(`Pedido ${id}: ${estado}`);
    } catch (e) { setErr(e.message); }
  };
  if (!d) return <p className="t-empty">{err || "Cargando pedidos…"}</p>;
  return (
    <section className="t-list">
      {err && <p className="t-err">{err}</p>}
      {d.flotas.map((f) => (
        <article key={f.id} className="t-flota">
          <header>
            <span className="t-mono">{f.id}</span>
            <strong>{f.empresa}</strong>
            <span className={"t-pill is-f-" + f.estado}>{f.estado}</span>
          </header>
          <p>{f.cantidad} vehículos · {f.tipos.join(", ")} · {f.contacto} · {fmtDia(f.creada.slice(0, 10))}</p>
          {f.mensaje && <blockquote>{f.mensaje}</blockquote>}
          <div className="t-flota-a">
            <a className="t-btn t-btn-wa" target="_blank" rel="noopener" href={waCliente(f.telefono, `Hola ${f.contacto.split(" ")[0]}, te escribimos de Hangar Mecánica por el pedido de mantenimiento para ${f.empresa}.`)}>WhatsApp</a>
            {f.email && <a className="t-btn" href={`mailto:${f.email}`}>Email</a>}
            <label className="t-field t-inline"><span>Estado</span>
              <select value={f.estado} onChange={(e) => cambiar(f.id, e.target.value)}>
                {d.estados.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
          </div>
        </article>
      ))}
      {!d.flotas.length && <p className="t-empty">Todavía no hay pedidos de flotas.</p>}
    </section>
  );
}

/* ---------------- ajustes ---------------- */
function Ajustes({ tok, data, setData, setToast, recargar }) {
  const [c, setC] = useState(() => structuredClone(data.config));
  const [franjas, setFranjas] = useState(data.config.franjas.join(", "));
  const [cerrado, setCerrado] = useState("");
  const [err, setErr] = useState("");
  const [guardando, setG] = useState(false);
  const setServ = (id, k, v) => setC((x) => ({ ...x, servicios: x.servicios.map((s) => (s.id === id ? { ...s, [k]: v } : s)) }));
  const guardar = async () => {
    setG(true); setErr("");
    try {
      const cfg = await api("/api/admin/config", { method: "PUT", token: tok, body: { ...c, franjas: franjas.split(/[,\s]+/).filter(Boolean) } });
      setC(cfg); setFranjas(cfg.franjas.join(", "));
      setData((d) => ({ ...d, config: cfg }));
      setToast("Ajustes guardados");
      recargar();
    } catch (e) { setErr(e.message); }
    finally { setG(false); }
  };
  const reset = async () => {
    if (!window.confirm("Esto borra todos los turnos y pedidos de la demo y vuelve a cargar los de ejemplo. No se puede deshacer. ¿Seguimos?")) return;
    try { await api("/api/admin/reset-demo", { method: "POST", token: tok }); setToast("Demo reiniciada"); recargar(); }
    catch (e) { setErr(e.message); }
  };
  const num = (v) => (v === "" ? "" : Number(v));
  return (
    <section className="t-ajustes">
      <div className="t-panel">
        <h2>Precios de mano de obra (desde)</h2>
        <p className="t-hint">Se muestran en la web y en el presupuesto orientativo. Camionetas ×1,2 · utilitarios ×1,35 · motos ×0,7.</p>
        <table className="t-table">
          <thead><tr><th scope="col">Servicio</th><th scope="col">Desde ($)</th><th scope="col">Horas</th></tr></thead>
          <tbody>
            {c.servicios.map((s) => (
              <tr key={s.id}>
                <th scope="row">{s.nombre}</th>
                <td><input aria-label={`Precio de ${s.nombre}`} inputMode="numeric" value={s.desde} onChange={(e) => setServ(s.id, "desde", num(e.target.value.replace(/\D/g, "")))} /></td>
                <td><input aria-label={`Horas de ${s.nombre}`} inputMode="decimal" value={s.horas} onChange={(e) => setServ(s.id, "horas", e.target.value.replace(",", "."))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="t-panel">
        <h2>Capacidad y horarios</h2>
        <div className="t-grid2">
          <label className="t-field"><span>Vehículos por franja</span><input inputMode="numeric" value={c.cupoFranja} onChange={(e) => setC({ ...c, cupoFranja: num(e.target.value) })} /></label>
          <label className="t-field"><span>Ingresos máximos por día</span><input inputMode="numeric" value={c.cupoDia} onChange={(e) => setC({ ...c, cupoDia: num(e.target.value) })} /></label>
          <label className="t-field"><span>Boxes</span><input inputMode="numeric" value={c.boxes} onChange={(e) => setC({ ...c, boxes: num(e.target.value) })} /></label>
          <label className="t-field"><span>Horas de trabajo por box</span><input inputMode="numeric" value={c.horasBox} onChange={(e) => setC({ ...c, horasBox: num(e.target.value) })} /></label>
        </div>
        <label className="t-field"><span>Horarios de ingreso (separados por coma)</span><input value={franjas} onChange={(e) => setFranjas(e.target.value)} /></label>
        <h3>Días cerrados</h3>
        <div className="t-cerrados">
          {c.cerrados.map((d) => <button key={d} className="t-chip" onClick={() => setC({ ...c, cerrados: c.cerrados.filter((x) => x !== d) })} aria-label={`Quitar ${fmtDia(d)}`}>{fmtDia(d)} ✕</button>)}
          {!c.cerrados.length && <span className="t-hint">Ninguno. Feriados y vacaciones van acá.</span>}
        </div>
        <div className="t-row-add">
          <label className="t-field t-inline"><span>Agregar día</span><input type="date" value={cerrado} min={data.hoy} onChange={(e) => setCerrado(e.target.value)} /></label>
          <button className="t-btn" disabled={!cerrado} onClick={() => { setC({ ...c, cerrados: [...new Set([...c.cerrados, cerrado])].sort() }); setCerrado(""); }}>Agregar</button>
        </div>
        <label className="t-field"><span>Aviso en la web (opcional)</span><input value={c.aviso} maxLength={160} onChange={(e) => setC({ ...c, aviso: e.target.value })} placeholder="Ej.: el viernes 20 cerramos a las 13 hs" /></label>
      </div>
      {err && <p className="t-err" role="alert">{err}</p>}
      <div className="t-save">
        <button className="t-btn t-btn-hot t-btn-lg" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar ajustes"}</button>
        <button className="t-btn t-btn-danger" onClick={reset}>Reiniciar datos de la demo</button>
      </div>
    </section>
  );
}

/* ---------------- orden de trabajo ---------------- */
function OrdenTrabajo({ o, data, patch, cerrar }) {
  const { estados, config } = data;
  const [box, setBox] = useState(o.box ?? "");
  const [km, setKm] = useState(o.km || "");
  const [nota, setNota] = useState(o.nota || "");
  const [items, setItems] = useState(o.presupuesto.length ? o.presupuesto : []);
  const [listo, setListo] = useState(o.listoEstimado || "");
  const [prox, setProx] = useState(o.proximoService || { fecha: "", km: "" });
  const [err, setErr] = useState("");
  const [g, setG] = useState(false);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", esc);
    document.documentElement.classList.add("menu-open");
    return () => { window.removeEventListener("keydown", esc); document.documentElement.classList.remove("menu-open"); };
  }, [cerrar]);

  const total = items.reduce((s, i) => s + (Number(i.precio) || 0), 0);
  const n = o.nombre.split(" ")[0];
  const veh = `${o.vehiculo.marca} ${o.vehiculo.modelo}`.trim();
  const ocupados = new Set(data.ordenes.filter((x) => x.box && x.codigo !== o.codigo).map((x) => x.box));

  const guardar = async (extra = {}) => {
    setG(true); setErr("");
    try {
      await patch(o.codigo, {
        box: box === "" ? null : Number(box),
        km: Number(String(km).replace(/\D/g, "")) || 0,
        nota,
        presupuesto: items.filter((i) => i.desc).map((i) => ({ desc: i.desc, precio: Number(i.precio) || 0 })),
        ...(listo ? { listoEstimado: listo } : {}),
        proximoService: prox.fecha ? { fecha: prox.fecha, km: prox.km ? Number(prox.km) : null } : null,
        ...extra,
      }, extra.estado ? `${fmtPatente(o.patente)}: ${estados.find((e) => e.id === extra.estado)?.nombre}` : "Orden guardada");
    } catch (e) { setErr(e.message); }
    finally { setG(false); }
  };

  const msgs = [
    ["Recibido", `Hola ${n}, ya tenemos tu ${veh} (${fmtPatente(o.patente)}) en Hangar Mecánica. Te avisamos apenas tengamos el diagnóstico.`],
    ["Presupuesto", `Hola ${n}, te pasamos el presupuesto de tu ${veh} (${fmtPatente(o.patente)}):\n${items.filter((i) => i.desc).map((i) => `• ${i.desc}: ${fmtPrecio(Number(i.precio) || 0)}`).join("\n")}\nTotal: ${fmtPrecio(total)}.\n¿Te parece bien que avancemos?`],
    ["Demora", `Hola ${n}, te cuento que estamos esperando un repuesto para tu ${veh}. Apenas llegue seguimos y te avisamos la fecha de entrega.`],
    ["Listo", `Hola ${n}, ¡tu ${veh} (${fmtPatente(o.patente)}) ya está listo! Podés pasar a retirarlo de lunes a viernes de 9 a 18:30 por Av. Sarmiento 2085.`],
  ];

  return (
    <div className="t-drawer-wrap" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <aside className="t-drawer" role="dialog" aria-modal="true" aria-label={`Orden ${o.codigo}`}>
        <header className="t-ot-head">
          <div>
            <span className="t-mono">{o.codigo} · {o.origen === "taller" ? "cargado en el taller" : "turno web"}</span>
            <h2><Placa p={o.patente} /> {veh} {o.vehiculo.anio || ""}</h2>
            <p>{o.nombre} · <a href={waCliente(o.telefono, `Hola ${n}, te escribimos de Hangar Mecánica.`)} target="_blank" rel="noopener">{o.telefono}</a> · ingreso {fmtDia(o.fecha)} {o.hora}</p>
          </div>
          <div className="t-ot-tools">
            <button className="t-btn" onClick={() => window.print()}>Imprimir OT</button>
            <button className="t-btn t-close" onClick={cerrar} aria-label="Cerrar">✕</button>
          </div>
        </header>

        <div className="t-ot-body">
          <div className="t-estados" role="group" aria-label="Estado">
            {estados.map((e) => (
              <button key={e.id} className={"t-est" + (o.estado === e.id ? " is-on is-" + e.id : "")} onClick={() => o.estado !== e.id && guardar({ estado: e.id })} disabled={g} aria-pressed={o.estado === e.id}>{e.nombre}</button>
            ))}
          </div>

          <div className="t-grid3">
            <label className="t-field"><span>Box</span>
              <select value={box} onChange={(e) => setBox(e.target.value)}>
                <option value="">Sin box</option>
                {Array.from({ length: config.boxes }, (_, i) => i + 1).map((b) => <option key={b} value={b} disabled={ocupados.has(b)}>Box {b}{ocupados.has(b) ? " (ocupado)" : ""}</option>)}
              </select>
            </label>
            <label className="t-field"><span>Km de ingreso</span><input inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} /></label>
            <label className="t-field"><span>Listo estimado</span><input type="date" value={listo} onChange={(e) => setListo(e.target.value)} /></label>
          </div>

          <div className="t-ot-pedido">
            <span className="t-mono">Pedido del cliente</span>
            <p>{o.estimado.lineas.map((l) => l.nombre).join(" · ")} — orientativo {fmtPrecio(o.estimado.total)}</p>
            {o.sintoma && <blockquote>“{o.sintoma}”</blockquote>}
          </div>

          <div className="t-ot-presu">
            <div className="t-ot-presu-h">
              <h3>Presupuesto</h3>
              {!items.length && <button className="t-btn" onClick={() => setItems(o.estimado.lineas.map((l) => ({ desc: l.nombre, precio: l.precio })))}>Usar el orientativo</button>}
            </div>
            {items.map((it, i) => (
              <div className="t-item" key={i}>
                <input aria-label="Descripción" value={it.desc} placeholder="Repuesto o mano de obra" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} />
                <input aria-label="Precio" inputMode="numeric" value={it.precio} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, precio: e.target.value.replace(/\D/g, "") } : x)))} />
                <button className="t-btn t-x" aria-label="Quitar línea" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <div className="t-ot-presu-f">
              <button className="t-btn" onClick={() => setItems([...items, { desc: "", precio: "" }])}>+ Agregar línea</button>
              <strong>Total {fmtPrecio(total)}</strong>
            </div>
          </div>

          <label className="t-field"><span>Diagnóstico y notas internas</span><textarea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} /></label>

          <div className="t-grid3">
            <label className="t-field"><span>Próximo service (fecha)</span><input type="date" value={prox.fecha} onChange={(e) => setProx({ ...prox, fecha: e.target.value })} /></label>
            <label className="t-field"><span>o a los km</span><input inputMode="numeric" value={prox.km || ""} onChange={(e) => setProx({ ...prox, km: e.target.value.replace(/\D/g, "") })} /></label>
            <button className="t-btn t-sug" onClick={() => setProx({ fecha: addDays(data.hoy, 180), km: km ? Math.ceil((Number(km) + 10000) / 1000) * 1000 : "" })}>Sugerir: 6 meses / +10.000 km</button>
          </div>

          {err && <p className="t-err" role="alert">{err}</p>}
          <div className="t-save">
            <button className="t-btn t-btn-hot t-btn-lg" onClick={() => guardar()} disabled={g}>{g ? "Guardando…" : "Guardar orden"}</button>
          </div>

          <div className="t-msgs">
            <h3>Mensajes listos para el cliente</h3>
            <div className="t-msgs-g">
              {msgs.map(([t, m]) => <a key={t} className="t-btn t-btn-wa" href={waCliente(o.telefono, m)} target="_blank" rel="noopener">{t}</a>)}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ---------------- nuevo ingreso ---------------- */
function NuevoIngreso({ data, tok, cerrar, onOk }) {
  const { config, disponibilidad } = data;
  const [f, setF] = useState({ tipo: "auto", marca: "", modelo: "", anio: "", patente: "", km: "", servicios: [], sintoma: "", nombre: "", telefono: "", ingresoAhora: true, fecha: "", hora: "" });
  const [err, setErr] = useState("");
  const [g, setG] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: k === "patente" ? e.target.value.toUpperCase() : e.target.value });
  const dia = disponibilidad.find((d) => d.fecha === f.fecha);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [cerrar]);
  const enviar = async (e) => {
    e.preventDefault();
    setG(true); setErr("");
    try { onOk((await api("/api/admin/ordenes", { method: "POST", token: tok, body: f })).orden); }
    catch (e2) { setErr(e2.message); }
    finally { setG(false); }
  };
  return (
    <div className="t-drawer-wrap" onClick={(e) => e.target === e.currentTarget && cerrar()}>
      <form className="t-drawer" role="dialog" aria-modal="true" aria-label="Nuevo ingreso" onSubmit={enviar}>
        <header className="t-ot-head">
          <div><span className="t-mono">Carga desde el taller</span><h2>Nuevo ingreso</h2></div>
          <button type="button" className="t-btn t-close" onClick={cerrar} aria-label="Cerrar">✕</button>
        </header>
        <div className="t-ot-body">
          <div className="t-seg" role="radiogroup" aria-label="Cuándo entra">
            <button type="button" className={f.ingresoAhora ? "is-on" : ""} aria-pressed={f.ingresoAhora} onClick={() => setF({ ...f, ingresoAhora: true })}>Entra ahora</button>
            <button type="button" className={!f.ingresoAhora ? "is-on" : ""} aria-pressed={!f.ingresoAhora} onClick={() => setF({ ...f, ingresoAhora: false })}>Reservar turno</button>
          </div>
          {!f.ingresoAhora && (
            <div className="t-grid2">
              <label className="t-field"><span>Día</span>
                <select value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value, hora: "" })}>
                  <option value="">Elegí</option>
                  {disponibilidad.map((d) => <option key={d.fecha} value={d.fecha}>{fmtDia(d.fecha)} · {d.libres} libres</option>)}
                </select>
              </label>
              <label className="t-field"><span>Hora</span>
                <select value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} disabled={!dia}>
                  <option value="">Elegí</option>
                  {dia?.franjas.map((h) => <option key={h.hora} value={h.hora}>{h.hora}{h.ok ? "" : " (lleno, se fuerza)"}</option>)}
                </select>
              </label>
            </div>
          )}
          <div className="t-grid3">
            <label className="t-field"><span>Tipo</span><select value={f.tipo} onChange={set("tipo")}>{config.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></label>
            <label className="t-field"><span>Patente</span><input value={f.patente} onChange={set("patente")} maxLength={9} /></label>
            <label className="t-field"><span>Km</span><input inputMode="numeric" value={f.km} onChange={set("km")} /></label>
            <label className="t-field"><span>Marca</span><input value={f.marca} onChange={set("marca")} /></label>
            <label className="t-field"><span>Modelo</span><input value={f.modelo} onChange={set("modelo")} /></label>
            <label className="t-field"><span>Año</span><input inputMode="numeric" value={f.anio} onChange={set("anio")} maxLength={4} /></label>
            <label className="t-field"><span>Cliente</span><input value={f.nombre} onChange={set("nombre")} /></label>
            <label className="t-field"><span>Celular</span><input inputMode="tel" value={f.telefono} onChange={set("telefono")} /></label>
          </div>
          <fieldset className="t-checks">
            <legend>Trabajos</legend>
            {config.servicios.map((s) => (
              <label key={s.id} className={"t-chk" + (f.servicios.includes(s.id) ? " is-on" : "")}>
                <input type="checkbox" checked={f.servicios.includes(s.id)} onChange={() => setF({ ...f, servicios: f.servicios.includes(s.id) ? f.servicios.filter((x) => x !== s.id) : [...f.servicios, s.id] })} />
                {s.nombre}
              </label>
            ))}
          </fieldset>
          <label className="t-field"><span>Qué le pasa</span><textarea rows={2} value={f.sintoma} onChange={set("sintoma")} /></label>
          {err && <p className="t-err" role="alert">{err}</p>}
          <div className="t-save"><button className="t-btn t-btn-hot t-btn-lg" disabled={g}>{g ? "Cargando…" : f.ingresoAhora ? "Registrar ingreso" : "Reservar turno"}</button></div>
        </div>
      </form>
    </div>
  );
}
