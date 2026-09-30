/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_BANNER?: string;
  readonly VITE_ADSENSE_SLOT_RESULTS?: string;
  readonly VITE_SHOW_AD_PLACEHOLDERS?: string;
}
