import { request } from '../client'
import type { DepartmentInput, DepartmentOption, ManagedDepartment } from '../types/department'

export async function getDepartmentOptions(signal?: AbortSignal): Promise<DepartmentOption[]> {
  return request.get<DepartmentOption[]>('/system/departments/options', { signal })
}
export async function getDepartments(signal?: AbortSignal): Promise<ManagedDepartment[]> {
  return request.get<ManagedDepartment[]>('/system/departments', { signal })
}
export async function createDepartment(input: DepartmentInput): Promise<ManagedDepartment> {
  return request.post<ManagedDepartment>('/system/departments', {
    json: input
  })
}
export async function updateDepartment(
  id: number,
  input: DepartmentInput
): Promise<ManagedDepartment> {
  return request.put<ManagedDepartment>(`/system/departments/${id}`, {
    json: input,
    extensions: { retry: 0 }
  })
}
export async function deleteDepartment(id: number): Promise<void> {
  await request.delete<null>(`/system/departments/${id}`, {
    extensions: { retry: 0 }
  })
}
