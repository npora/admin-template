interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_PREFIX: string
  readonly VITE_API_URL?: string

  readonly VITE_TOKEN_STORAGE?: 'session' | 'local' | 'memory'

  readonly VITE_BUILD_COMPRESS?: 'true' | 'false'
  readonly VITE_BUILD_ANALYZE?: 'true' | 'false'

  readonly VITE_DEMO_ENABLED?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 由构建层决定是否加载独立演示页面。 */
declare const __DEMO_ENABLED__: boolean
