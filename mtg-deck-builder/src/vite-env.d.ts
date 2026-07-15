/// <reference types="vite/client" />

declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Impact.com deep-link template for the TCGplayer affiliate program — see
   *  the comment above tcgplayerUrl() in lib/priceSource.ts. Optional. */
  readonly VITE_TCGPLAYER_AFFILIATE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
