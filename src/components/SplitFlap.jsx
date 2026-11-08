import { useEffect, useRef, useState } from "react";

const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Texto estilo tablero de aeropuerto: cada letra gira por el abecedario hasta quedar fija */
export default function SplitFlap({ text, className = "", delay = 0, step = 42, spin = 300, run = true, onDone }) {
  const target = String(text).toUpperCase();
  const blank = target.replace(/\S/g, " ");
  const [shown, setShown] = useState(blank);
  const last = useRef(blank);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!run) return;
    let raf;
    const start = performance.now() + delay;
    const tick = (t) => {
      const el = t - start;
      let out = "";
      let all = true;
      for (let i = 0; i < target.length; i++) {
        const c = target[i];
        if (c === " ") { out += " "; continue; }
        if (el < i * step) { out += " "; all = false; }
        else if (el < i * step + spin) { out += POOL[(Math.floor(el / 60) * 7 + i * 11) % POOL.length]; all = false; }
        else out += c;
      }
      if (out !== last.current) { last.current = out; setShown(out); }
      if (all) doneRef.current?.();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, delay, step, spin]);

  let idx = 0;
  return (
    <span className={"flap " + className} aria-label={text} role="text">
      {target.split(" ").map((word, w) => {
        const chars = [...word].map((_, j) => shown[idx + j]);
        idx += word.length + 1;
        return (
          <span className="flap-word" aria-hidden="true" key={w}>
            {chars.map((c, j) => (
              <span className="flap-tile" key={j + ":" + c}>{c === " " ? " " : c}</span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
