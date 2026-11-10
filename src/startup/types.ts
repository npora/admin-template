export interface StartupMessages {
  loading: string
  slow: string
  failed: string
  retry: string
}
export interface StartupLoading {
  setMessages(messages: StartupMessages): void
  complete(): void
  fail(): void
}
declare global {
  interface Window {
    __APP_STARTUP__?: StartupLoading
  }
}
