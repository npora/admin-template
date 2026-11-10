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
    json: input,
    extensions: { retry: 0 }
  })
}

export async function deleteUser(id: number): Promise<void> {
  await request.delete<null>(`/system/users/${id}`, {
    extensions: { retry: 0 }
  })
}
