import { Link } from 'react-router-dom';
import { BRAND } from '../brand';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-fog sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {BRAND.company}. Fan-made online adaptation of the bullhead card game.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/rules" className="hover:text-white">Rules</Link>
          <Link to="/plus" className="hover:text-white">Plus</Link>
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-white">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
