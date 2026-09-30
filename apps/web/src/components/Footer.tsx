import { Link } from 'react-router-dom';
import { BRAND } from '../brand';
import { useT } from '../i18n';

export function Footer() {
  const t = useT();
  return (
    <footer className="mt-24 border-t border-white/6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-fog sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl">
          © {new Date().getFullYear()} {BRAND.company}. {t('An independent game, not affiliated with or endorsed by AMIGO Spiele. 6 nimmt!® is a trademark of AMIGO Spiele.')}
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/rules" className="hover:text-white">{t('Rules')}</Link>
          <Link to="/6-nimmt-online" className="hover:text-white">6 nimmt! online</Link>
          <Link to="/take-5-online" className="hover:text-white">Take 5 online</Link>
          <Link to="/zh-tw" className="hover:text-white">誰是牛頭王 線上版</Link>
          <Link to="/plus" className="hover:text-white">Plus</Link>
          <Link to="/privacy" className="hover:text-white">{t('Privacy')}</Link>
          <Link to="/terms" className="hover:text-white">{t('Terms')}</Link>
          <Link to="/contact" className="hover:text-white">{t('Contact')}</Link>
          {BRAND.supportEmail && <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-white">{BRAND.supportEmail}</a>}
        </nav>
      </div>
    </footer>
  );
}
