import type { AuthenticatorStatus, AuthenticatorSetup } from '../types/auth'
import { request } from '../client'
import type { PageResult } from '../types/common'
import type { CreateUserInput, ManagedUser, UpdateUserInput, UserListQuery } from '../types/user'

export async function getUsers(
  query: UserListQuery,
  signal?: AbortSignal
): Promise<PageResult<ManagedUser>> {
  return request.get<PageResult<ManagedUser>>('/system/users', {
    query: { ...query },
    signal
  })
}

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  return request.post<ManagedUser>('/system/users', {
    json: input
  })
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<ManagedUser> {
  return request.put<ManagedUser>(`/system/users/${id}`, {
    json: input
  })
}

export async function deleteUser(id: number): Promise<void> {
  await request.delete<null>(`/system/users/${id}`)
}

export function resetUserPassword(
  id: number,
  currentPassword: string,
  newPassword: string,
  signal?: AbortSignal
) {
  return request.post<null>(`/system/users/${id}/password`, {
    json: { currentPassword, newPassword },
    signal
  })
}

export function getUserAuthenticatorStatus(id: number, signal?: AbortSignal) {
  return request.get<AuthenticatorStatus>(`/system/users/${id}/totp`, { signal })
}
export function setupUserAuthenticator(id: number, password: string, signal?: AbortSignal) {
  return request.post<AuthenticatorSetup>(`/system/users/${id}/totp/setup`, {
    json: { password },
    signal
  })
}
export function disableUserAuthenticator(
  id: number,
  password: string,
  code: string,
  signal?: AbortSignal
) {
  return request.post<null>(`/system/users/${id}/totp/disable`, {
    json: { password, code },
    signal
  })
}
