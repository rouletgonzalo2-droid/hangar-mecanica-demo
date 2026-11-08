import { useEffect, useRef, useState } from "react";

/** Marca el elemento con data-in cuando entra en pantalla (una sola vez) */
export function useReveal(margin = "-12% 0px") {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.dataset.in = "1"; io.disconnect(); } },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return ref;
}

/** true mientras el elemento está visible y la pestaña activa (para pausar animaciones caras) */
export function useActive(ref) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    const upd = () => setActive(visible && !document.hidden);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; upd(); });
    io.observe(el);
    document.addEventListener("visibilitychange", upd);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", upd); };
  }, [ref]);
  return active;
}
