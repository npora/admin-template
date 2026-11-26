interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_PREFIX: string
  readonly VITE_API_URL?: string

  readonly VITE_TOKEN_STORAGE?: 'session' | 'local' | 'memory'
  readonly VITE_AUTHENTICATOR_ENABLED?: 'true' | 'false'
  readonly VITE_PASSWORD_RESET_CONTACT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 由构建层决定是否加载独立演示页面。 */
