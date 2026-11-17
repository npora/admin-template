/** 仅配置认证界面；验证器校验和会话有效期由后端决定。 */
export const authConfig = {
  authenticatorEnabled: import.meta.env.VITE_AUTHENTICATOR_ENABLED === 'true',
  rememberLoginEnabled: import.meta.env.VITE_TOKEN_STORAGE !== 'memory',
  passwordResetContact: import.meta.env.VITE_PASSWORD_RESET_CONTACT?.trim() || ''
} as const
