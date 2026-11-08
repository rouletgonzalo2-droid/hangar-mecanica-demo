import { useEffect, useRef } from "react";
import { useActive } from "../lib/hooks.js";
import { img } from "../lib/negocio.js";

/** Riel de fotos que avanza con el scroll y se inclina según la velocidad */
export default function PhotoRail({ fotos }) {
  const wrap = useRef(null);
  const track = useRef(null);
  const active = useActive(wrap);

  useEffect(() => {
    if (!active) return;
    let raf, lastY = window.scrollY, skew = 0;
    const loop = () => {
      const y = window.scrollY;
      const v = y - lastY;
      lastY = y;
      skew += (Math.max(-9, Math.min(9, v * 0.35)) - skew) * 0.12;
      const r = wrap.current.getBoundingClientRect();
      const p = (window.innerHeight - r.top) / (window.innerHeight + r.height); // 0 → 1 mientras cruza
      const max = track.current.scrollWidth - wrap.current.clientWidth;
      track.current.style.transform = `translate3d(${-Math.max(0, Math.min(1, p)) * max}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div className="rail" ref={wrap}>
      <div className="rail-track" ref={track}>
        {fotos.map(([id, alt], i) => (
          <figure className={"rail-item" + (i % 3 === 1 ? " is-tall" : "")} key={id}>
            <img src={img(id, 900)} alt={alt} loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>
    </div>
  );
}
