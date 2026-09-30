import { Link } from 'react-router-dom';
import { BRAND } from '../brand';
import { useT } from '../i18n';

/** Three quiet tiers: main links, the legal line, and the alternate game names (there for search, not for reading). */
export function Footer() {
  const t = useT();
  const link = 'transition hover:text-white';
  return (
    <footer className="mt-20 border-t border-white/[0.04]">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-6">
        <nav className="flex flex-wrap gap-x-5 gap-y-1.5 text-[15px] font-medium text-mist">
          <Link to="/rules" className={link}>{t('Game rules')}</Link>
          <Link to="/learn" className={link}>{t('Interactive tutorial')}</Link>
          <Link to="/plus" className={link}>Plus</Link>
          <Link to="/privacy" className={link}>{t('Privacy')}</Link>
          <Link to="/terms" className={link}>{t('Terms')}</Link>
          {BRAND.supportEmail ? (
            <a href={`mailto:${BRAND.supportEmail}`} className={link}>{t('Contact')} ↗</a>
          ) : (
            <Link to="/contact" className={link}>{t('Contact')}</Link>
          )}
        </nav>
        <p className="max-w-2xl text-[13px] leading-relaxed text-[#7f858f]">
          © {new Date().getFullYear()} {BRAND.company}. {t('Independent game. Not affiliated with or endorsed by AMIGO Spiele. 6 nimmt!® is a trademark of AMIGO Spiele.')}
        </p>
        <nav aria-label={t('Also known as')} className="flex flex-wrap gap-x-1.5 text-xs text-white/25">
          <Link to="/6-nimmt-online" className="hover:text-fog">6 nimmt! online</Link>
          <span aria-hidden>·</span>
          <Link to="/take-5-online" className="hover:text-fog">Take 5 online</Link>
          <span aria-hidden>·</span>
          <Link to="/zh-tw" className="hover:text-fog">誰是牛頭王線上版</Link>
        </nav>
      </div>
    </footer>
  );
}
