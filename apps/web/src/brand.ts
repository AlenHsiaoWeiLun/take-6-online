/** Product naming and domain live here so a rebrand is a one-line change. */
export const BRAND = {
  name: 'Bullheads Online',
  short: 'Bullheads',
  plus: 'Bullheads Plus',
  tagline: 'Don\u2019t take the sixth card.',
  /** Set VITE_SUPPORT_EMAIL once a real inbox exists; until then everything points at the contact form. */
  supportEmail: (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || '',
  company: 'Bullheads Online',
};
