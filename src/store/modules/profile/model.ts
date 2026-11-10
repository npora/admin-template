export interface LocalProfile {
  displayName: string
  avatar: string
  email: string
  mobile: string
  bio: string
}
export function createLocalProfile(): LocalProfile {
  return { displayName: '', avatar: '', email: '', mobile: '', bio: '' }
}
export function profileErrors(profile: LocalProfile): Partial<Record<keyof LocalProfile, string>> {
  const errors: Partial<Record<keyof LocalProfile, string>> = {}
  if (!profile.displayName.trim() || profile.displayName.trim().length > 100)
    errors.displayName = 'nameRule'
  if (
    profile.email &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) || profile.email.length > 255)
  )
    errors.email = 'emailRule'
  if (profile.mobile.length > 32) errors.mobile = 'mobileRule'
  if (profile.bio.length > 400) errors.bio = 'bioRule'
  if (profile.avatar) {
    try {
      const url = new URL(profile.avatar)
      if (
        profile.avatar.length > 500 ||
        !['http:', 'https:'].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password
      )
        errors.avatar = 'avatarRule'
    } catch {
      errors.avatar = 'avatarRule'
    }
  }
  return errors
}
export function resolveProfileMap(value: unknown): Record<string, LocalProfile> {
  const result: Record<string, LocalProfile> = Object.create(null)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result
  for (const [key, raw] of Object.entries(value).slice(-20)) {
    if (!raw || typeof raw !== 'object' || !/^\d+:.{1,64}$/.test(key)) continue
    const source = raw as Record<string, unknown>,
      profile = createLocalProfile()
    if (!Object.keys(profile).every((field) => typeof source[field] === 'string')) continue
    for (const field of Object.keys(profile) as (keyof LocalProfile)[])
      profile[field] = (source[field] as string).trim()
    if (!Object.keys(profileErrors(profile)).length) result[key] = profile
  }
  return result
}
