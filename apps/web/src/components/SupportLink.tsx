import { Link } from 'react-router-dom';
import { BRAND } from '../brand';

/** The support inbox when one is configured, otherwise the contact form. */
export function SupportLink({ className }: { className?: string }) {
  return BRAND.supportEmail ? (
    <a href={`mailto:${BRAND.supportEmail}`} className={className}>
      {BRAND.supportEmail}
    </a>
  ) : (
    <Link to="/contact" className={className}>
      the contact form
    </Link>
  );
}
