const trim = (v?: string) => (v ?? '').trim().replace(/\/$/, '');

export const config = {
  serverUrl: trim(import.meta.env.VITE_SERVER_URL) || 'http://localhost:3001',
  siteUrl: trim(import.meta.env.VITE_SITE_URL) || (typeof window !== 'undefined' ? window.location.origin : ''),
  insforgeUrl: trim(import.meta.env.VITE_INSFORGE_URL),
  insforgeAnonKey: (import.meta.env.VITE_INSFORGE_ANON_KEY ?? '').trim(),
  adsenseClient: (import.meta.env.VITE_ADSENSE_CLIENT ?? '').trim(),
  adSlots: {
    banner: (import.meta.env.VITE_ADSENSE_SLOT_BANNER ?? '').trim(),
    results: (import.meta.env.VITE_ADSENSE_SLOT_RESULTS ?? '').trim(),
  },
  showAdPlaceholders: import.meta.env.VITE_SHOW_AD_PLACEHOLDERS === 'true',
};
