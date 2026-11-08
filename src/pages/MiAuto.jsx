import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api.js";
import { fmtDiaLargo, fmtPatente, fmtPrecio, wa } from "../lib/negocio.js";
import SplitFlap from "../components/SplitFlap.jsx";

// el recorrido que se muestra; "repuesto" solo aparece si el auto pasa por ahí
const RUTA = ["reservado", "recibido", "diagnostico", "presupuesto", "reparacion", "listo", "entregado"];

export default function MiAuto() {
  const loc = useLocation();
  const [patente, setPatente] = useState(loc.state?.patente || "");
  const [tel4, setTel4] = useState(loc.state?.tel4 || "");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [cargando, setCargando] = useState(false);

  const buscar = async (e) => {
    e?.preventDefault();
    setErr("");
    if (patente.replace(/[^A-Z0-9]/gi, "").length < 6 || tel4.length !== 4) {
      setErr("Escribí la patente y los últimos 4 números del celular que dejaste en el taller.");
      return;
    }
    setCargando(true);
    try {
      setData(await api(`/api/mi-auto?patente=${encodeURIComponent(patente)}&tel4=${tel4}`));
    } catch (e2) {
      setData(null);
      setErr(e2.message);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => {
    document.title = "Mi auto · Hangar Mecánica";
    if (loc.state?.patente && loc.state?.tel4) buscar();
    return () => { document.title = "Hangar Mecánica · Taller mecánico en Belén de Escobar · Bosch Car Service"; };
  }, []);

  const a = data?.actual;
  const estadoInfo = a && data.estados.find((e) => e.id === a.estado);
  const ruta = a ? (a.estado === "repuesto" || a.estado === "aprobado" ? RUTA.map((r) => (r === "presupuesto" ? a.estado : r)) : RUTA) : [];
  const pos = a ? Math.max(0, ruta.indexOf(a.estado)) : 0;

  return (
    <main id="contenido" className="miauto">
      <div className="wrap">
        <header className="miauto-head">
          <p className="eyebrow"><span className="sq" aria-hidden="true" />Estado del vehículo</p>
          <h1>Mi auto en el hangar</h1>
          <p className="sec-lead">Con la patente y los últimos 4 números de tu celular ves en qué etapa está, el presupuesto y los trabajos anteriores.</p>
        </header>

        <form className="miauto-form" onSubmit={buscar} noValidate>
          <label className="campo"><span className="campo-l">Patente</span>
            <input className="in-placa" value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())} maxLength={9} placeholder="AB 123 CD" autoComplete="off" />
          </label>
          <label className="campo"><span className="campo-l">Últimos 4 del celular</span>
            <input value={tel4} onChange={(e) => setTel4(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="1234" autoComplete="off" />
          </label>
          <button className="btn btn-primary" type="submit" disabled={cargando}>{cargando ? "Buscando…" : "Ver estado"}</button>
          {err && <p className="form-err" role="alert">{err}</p>}
        </form>

        {data && (
          <div className="vuelo" aria-live="polite">
            <div className="vuelo-board">
              <div className="vuelo-cell"><span className="k">Patente</span><span className="placa">{fmtPatente(data.patente)}</span></div>
              <div className="vuelo-cell"><span className="k">Vehículo</span><strong>{data.vehiculo.marca} {data.vehiculo.modelo}</strong></div>
              <div className="vuelo-cell vuelo-estado">
                <span className="k">Estado</span>
                {a ? <SplitFlap key={a.estado} text={estadoInfo.vuelo} className={"flap-state is-" + a.estado} /> : <SplitFlap text="SIN TRABAJOS" className="flap-state" />}
              </div>
            </div>

            {a ? (
              <>
                <p className="vuelo-hola">
                  Hola {data.nombre}: {estadoInfo.nombre.toLowerCase()}.
                  {a.estado !== "listo" && a.listoEstimado && <> Estimamos tenerlo listo el <strong>{fmtDiaLargo(a.listoEstimado)}</strong>.</>}
                  {a.estado === "listo" && <> Podés pasar a retirarlo de lunes a viernes de 9 a 18:30.</>}
                </p>
                <ol className="ruta" style={{ "--p": pos / (ruta.length - 1) }}>
                  {ruta.map((r, i) => {
                    const e = data.estados.find((x) => x.id === r);
                    return (
                      <li key={r} className={i < pos ? "is-done" : i === pos ? "is-on" : ""}>
                        <span className="ruta-dot" aria-hidden="true" />
                        <span className="ruta-l">{e?.nombre}</span>
                      </li>
                    );
                  })}
                </ol>
                <div className="vuelo-grid">
                  <div className="vuelo-panel">
                    <h2>Orden {a.codigo}</h2>
                    <dl className="dl">
                      <div><dt>Ingreso</dt><dd>{fmtDiaLargo(a.fecha)} · {a.hora} h</dd></div>
                      {a.box && <div><dt>Box</dt><dd>{a.box}</dd></div>}
                      <div><dt>Pedido</dt><dd>{a.trabajos.join(" · ")}</dd></div>
                    </dl>
                  </div>
                  {a.presupuesto && (
                    <div className="vuelo-panel">
                      <h2>Presupuesto</h2>
                      <ul className="presu">
                        {a.presupuesto.map((p, i) => <li key={i}><span>{p.desc}</span><span>{fmtPrecio(p.precio)}</span></li>)}
                        <li className="presu-total"><span>Total</span><span>{fmtPrecio(a.presupuesto.reduce((s, p) => s + p.precio, 0))}</span></li>
                      </ul>
                      {a.estado === "presupuesto" && (
                        <a className="btn btn-primary" target="_blank" rel="noopener"
                          href={wa(`Hola Hangar, apruebo el presupuesto de la orden ${a.codigo} (patente ${fmtPatente(data.patente)}).`)}>Aprobar por WhatsApp</a>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="vuelo-hola">Hola {data.nombre}: no tenés trabajos en curso. Abajo está el historial de tu vehículo.</p>
            )}

            {(data.proximoService || data.pasadas.length > 0) && (
              <div className="vuelo-grid">
                {data.proximoService && (
                  <div className="vuelo-panel vuelo-next">
                    <h2>Próximo service</h2>
                    <p className="next-big">{fmtDiaLargo(data.proximoService.fecha)}</p>
                    {data.proximoService.km && <p>o a los {data.proximoService.km.toLocaleString("es-AR")} km, lo que llegue primero.</p>}
                    <a className="btn btn-ghost" target="_blank" rel="noopener" href={wa(`Hola Hangar, quiero turno para el service de la patente ${fmtPatente(data.patente)}.`)}>Pedir turno de service</a>
                  </div>
                )}
                {data.pasadas.length > 0 && (
                  <div className="vuelo-panel">
                    <h2>Historial</h2>
                    <ul className="hist">
                      {data.pasadas.map((p, i) => (
                        <li key={i}><span className="hist-f">{fmtDiaLargo(p.fecha)}{p.km ? ` · ${p.km.toLocaleString("es-AR")} km` : ""}</span><span>{p.trabajos.join(" · ")}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
