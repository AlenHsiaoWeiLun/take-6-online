import { Link, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { RoomPage } from './pages/RoomPage';
import { Plus, PlusSuccess } from './pages/Plus';
import { Leaderboard } from './pages/Leaderboard';
import { Rules } from './pages/Rules';
import { Privacy, Terms } from './pages/Legal';
import { Contact } from './pages/Contact';
import { Learn } from './pages/Learn';
import { artUrl } from './art/Art';
import { useT } from './i18n';
import { LANDINGS, Landing } from './pages/Landing';
import { FxLayer } from './fx/fx';

function SiteLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function NotFound() {
  const t = useT();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-bold">{t('Lost in the pasture')}</h1>
      <p className="mt-2 text-fog">{t('That page doesn’t exist.')}</p>
      <Link to="/" className="btn btn-primary mt-6">{t('Go home')}</Link>
    </div>
  );
}

export default function App() {
  const bg = artUrl('background-home');
  return (
    <>
      <div className="backdrop" data-art={bg ? '' : undefined} style={bg ? ({ '--bg-art': `url(${bg})` } as React.CSSProperties) : undefined} />
      <Routes>
        <Route path="/play/:code" element={<RoomPage />} />
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="plus" element={<Plus />} />
          <Route path="plus/success" element={<PlusSuccess />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="rules" element={<Rules />} />
          {LANDINGS.map((l) => (
            <Route key={l.path} path={l.path.slice(1)} element={<Landing content={l} />} />
          ))}
          <Route path="contact" element={<Contact />} />
          <Route path="learn" element={<Learn />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route
            path="*"
            element={<NotFound />}
          />
        </Route>
      </Routes>
      <FxLayer />
    </>
  );
}
