/** Festejo al confirmar el turno: acelerada de motor (WebAudio) + banderitas a cuadros */

export function revEngine() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const t0 = ac.currentTime;
    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.22, t0 + 0.08);
    master.gain.setValueAtTime(0.22, t0 + 1.0);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(500, t0);
    lp.frequency.linearRampToValueAtTime(1600, t0 + 0.6);
    lp.frequency.linearRampToValueAtTime(600, t0 + 1.5);
    lp.connect(master).connect(ac.destination);
    // dos osciladores desafinados = sonido de motor; la frecuencia sube y baja como una acelerada
    for (const [type, mult] of [["sawtooth", 1], ["square", 0.5]]) {
      const o = ac.createOscillator();
      o.type = type;
      const f = o.frequency;
      f.setValueAtTime(45 * mult, t0);
      f.exponentialRampToValueAtTime(150 * mult, t0 + 0.55);
      f.exponentialRampToValueAtTime(120 * mult, t0 + 0.75);
      f.exponentialRampToValueAtTime(48 * mult, t0 + 1.5);
      const g = ac.createGain();
      g.gain.value = type === "square" ? 0.35 : 0.6;
      // vibrato de los cilindros
      const lfo = ac.createOscillator();
      const lg = ac.createGain();
      lfo.frequency.value = 28;
      lg.gain.value = 6 * mult;
      lfo.connect(lg).connect(o.frequency);
      o.connect(g).connect(lp);
      o.start(t0); lfo.start(t0);
      o.stop(t0 + 1.7); lfo.stop(t0 + 1.7);
    }
    setTimeout(() => ac.close(), 2000);
  } catch { /* sin audio: no pasa nada */ }
}

export function checkeredFlags() {
  const c = document.createElement("canvas");
  c.className = "flags-canvas";
  c.setAttribute("aria-hidden", "true");
  document.body.appendChild(c);
  const ctx = c.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  c.width = W * dpr; c.height = H * dpr;
  ctx.scale(dpr, dpr);
  const colors = ["#F2540C", "#0F1B26", "#13A37A"];
  const N = Math.min(110, Math.round(W / 9));
  const parts = Array.from({ length: N }, (_, i) => ({
    x: W * (0.15 + Math.random() * 0.7),
    y: H * (0.55 + Math.random() * 0.2),
    vx: (Math.random() - 0.5) * 22,
    vy: -Math.random() * 17 - 8,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    s: 12 + Math.random() * 12,
    flag: i % 3 !== 2,
    col: colors[i % colors.length],
    flip: Math.random() * 6,
  }));
  const start = performance.now();
  const draw = (t) => {
    const el = t - start;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.42; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      const sy = Math.cos(p.flip + el / 140); // flameo
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.scale(1, sy);
      if (p.flag) {
        const q = p.s / 4;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
          ctx.fillStyle = (i + j) % 2 ? "#0F1B26" : "#F7F5F1";
          ctx.fillRect(-p.s / 2 + i * q, -q * 1.5 + j * q, q, q);
        }
      } else {
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.s / 2, -p.s / 6, p.s, p.s / 3);
      }
      ctx.restore();
    }
    if (el < 2600) requestAnimationFrame(draw);
    else c.remove();
  };
  requestAnimationFrame(draw);
}
