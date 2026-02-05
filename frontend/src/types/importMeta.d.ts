// Extensão do tipo ImportMeta para incluir as variáveis de ambiente do Vite
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_TENANT_SLUG?: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  // Adicione outras variáveis de ambiente conforme necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}