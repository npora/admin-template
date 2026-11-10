import { request } from '../client'
import { unwrapApiResponse } from '../protocol/default'
import type { DefaultApiResponse } from '../types/common'
import type { DepartmentInput, DepartmentOption, ManagedDepartment } from '../types/department'

export async function getDepartmentOptions(): Promise<DepartmentOption[]> {
  return unwrapApiResponse(
    await request.get<DefaultApiResponse<DepartmentOption[]>>('/system/departments/options')
  )
}
export async function getDepartments(signal?: AbortSignal): Promise<ManagedDepartment[]> {
  return unwrapApiResponse(
    await request.get<DefaultApiResponse<ManagedDepartment[]>>('/system/departments', { signal })
  )
}
export async function createDepartment(input: DepartmentInput): Promise<ManagedDepartment> {
  return unwrapApiResponse(
    await request.post<DefaultApiResponse<ManagedDepartment>>('/system/departments', {
      json: input
    })
  )
}
export async function updateDepartment(
  id: number,
  input: DepartmentInput
): Promise<ManagedDepartment> {
  return unwrapApiResponse(
    await request.put<DefaultApiResponse<ManagedDepartment>>(`/system/departments/${id}`, {
      json: input,
      extensions: { retry: 0 }
    })
  )
}
export async function deleteDepartment(id: number): Promise<void> {
  unwrapApiResponse(
    await request.delete<DefaultApiResponse<null>>(`/system/departments/${id}`, {
      extensions: { retry: 0 }
    })
  )
}
