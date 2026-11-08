import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { DemoBanner, Nav, Footer, MobileBar } from "./components/Chrome.jsx";
import Home from "./pages/Home.jsx";
import MiAuto from "./pages/MiAuto.jsx";

const Admin = lazy(() => import("./pages/Admin.jsx"));

export default function App() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname]);

  if (pathname.startsWith("/admin")) {
    return (
      <Suspense fallback={<p className="cargando">Abriendo la torre…</p>}>
        <Admin />
      </Suspense>
    );
  }
  return (
    <>
      <DemoBanner />
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mi-auto" element={<MiAuto />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Footer />
      <MobileBar />
    </>
  );
}
