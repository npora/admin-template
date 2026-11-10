interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_PREFIX: string
  readonly VITE_API_URL?: string

  readonly VITE_TOKEN_STORAGE?: 'session' | 'local' | 'memory'

  readonly VITE_BUILD_COMPRESS?: 'true' | 'false'
  readonly VITE_BUILD_ANALYZE?: 'true' | 'false'

  readonly VITE_API_MOCK?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 由构建层检测可选 Mock 目录，不绑定具体后端实现。 */
declare const __MOCK_AVAILABLE__: boolean
