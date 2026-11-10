import { useRouter } from 'vue-router'
import { getSession } from '@/services/session'

/** 组件中获取当前 Router 的会话服务。 */
export function useSession(router = useRouter()) {
  return getSession(router)
}
