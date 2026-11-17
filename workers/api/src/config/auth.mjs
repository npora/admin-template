/** 后端认证默认值。密钥只从 Worker 环境绑定读取，不写在本文件中。 */
export const AUTH_DEFAULTS = Object.freeze({
  authenticatorEnabled: false,
  authenticatorIssuer: 'Npora Admin',
  sessionTtlMs: 60 * 60_000,
  rememberedSessionTtlMs: 7 * 24 * 60 * 60_000
})

/** 环境变量优先，便于同一份代码在不同环境测试，默认不允许新绑定。 */
export function resolveAuthConfig(env = {}) {
  return {
    ...AUTH_DEFAULTS,
    authenticatorEnabled:
      env.AUTH_TOTP_ENABLED === undefined
        ? AUTH_DEFAULTS.authenticatorEnabled
        : env.AUTH_TOTP_ENABLED === 'true',
    authenticatorIssuer:
      (typeof env.AUTH_TOTP_ISSUER === 'string' && env.AUTH_TOTP_ISSUER.trim().slice(0, 80)) ||
      AUTH_DEFAULTS.authenticatorIssuer
  }
}
