import { request } from '../client'
import { unwrapApiResponse } from '../protocol/default'
import type { DefaultApiResponse, PageResult } from '../types/common'
import type { CreateUserInput, ManagedUser, UpdateUserInput, UserListQuery } from '../types/user'

export async function getUsers(
  query: UserListQuery,
  signal?: AbortSignal
): Promise<PageResult<ManagedUser>> {
  const response = await request.get<DefaultApiResponse<PageResult<ManagedUser>>>('/system/users', {
    query: { ...query },
    signal
  })
  return unwrapApiResponse(response)
}

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  const response = await request.post<DefaultApiResponse<ManagedUser>>('/system/users', {
    json: input
  })
  return unwrapApiResponse(response)
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<ManagedUser> {
  const response = await request.put<DefaultApiResponse<ManagedUser>>(`/system/users/${id}`, {
    json: input,
    extensions: { retry: 0 }
  })
  return unwrapApiResponse(response)
}

export async function deleteUser(id: number): Promise<void> {
  const response = await request.delete<DefaultApiResponse<null>>(`/system/users/${id}`, {
    extensions: { retry: 0 }
  })
  unwrapApiResponse(response)
}
