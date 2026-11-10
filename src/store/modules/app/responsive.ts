import { matchesMedia, watchMedia } from '@/utils/media-query'
import type { DeviceType } from './types'

const MOBILE_MEDIA_QUERY = '(max-width: 767px)'

export function getDevice(): DeviceType {
  return matchesMedia(MOBILE_MEDIA_QUERY) ? 'mobile' : 'desktop'
}

export function watchDevice(callback: (device: DeviceType) => void): () => void {
  return watchMedia(MOBILE_MEDIA_QUERY, (matches) => callback(matches ? 'mobile' : 'desktop'))
}
