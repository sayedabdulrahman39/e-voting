/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_VOTING_ADDRESS?: string;
  readonly VITE_REGISTRY_ADDRESS?: string;
  readonly VITE_ATTESTATION_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
