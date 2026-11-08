import { useEffect, useRef } from "react";
import { useActive } from "../lib/hooks.js";

/** Osciloscopio de diagnóstico: pulso de inyector, sensor de oxígeno y chispa de encendido */
export default function Scope() {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const active = useActive(wrap);

  useEffect(() => {
    if (!active) return;
    const c = canvas.current;
    const ctx = c.getContext("2d");
    let raf, w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const traces = [
      { color: "rgba(242,84,12,.95)", y: 0.24, amp: 0.1, f: (x) => (((x % 1) + 1) % 1 < 0.18 ? -1 : ((x % 1) + 1) % 1 < 0.2 ? 1.6 : 0.15) }, // inyector
      { color: "rgba(19,163,122,.9)", y: 0.52, amp: 0.09, f: (x) => Math.sin(x * Math.PI * 2) * 0.8 + Math.sin(x * 11) * 0.08 }, // sonda lambda
      { color: "rgba(236,232,225,.75)", y: 0.8, amp: 0.1, f: (x) => { const p = ((x % 1) + 1) % 1; return p < 0.02 ? -2.4 : p < 0.08 ? Math.sin(p * 220) * (0.08 - p) * 9 : 0; } }, // chispa
    ];
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      // grilla
      ctx.strokeStyle = "rgba(236,232,225,.07)";
      ctx.lineWidth = 1;
      const gx = Math.max(40, w / 18);
      for (let x = (-(t * 0.02) % gx); x < w; x += gx) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += gx) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const period = Math.max(180, w / 5);
      traces.forEach((tr, k) => {
        ctx.beginPath();
        ctx.strokeStyle = tr.color;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = tr.color;
        ctx.shadowBlur = 8;
        for (let x = 0; x <= w; x += 2) {
          const v = tr.f((x + t * (0.09 + k * 0.025)) / period);
          const y = h * tr.y + v * h * tr.amp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [active]);

  return (
    <div className="scope" ref={wrap} aria-hidden="true">
      <canvas ref={canvas} />
      <span className="scope-tag" style={{ top: "14%" }}>INY 3 · 2,8 ms</span>
      <span className="scope-tag" style={{ top: "42%" }}>O2 · 0,1–0,9 V</span>
      <span className="scope-tag" style={{ top: "70%" }}>ENC · 8 kV</span>
    </div>
  );
}
