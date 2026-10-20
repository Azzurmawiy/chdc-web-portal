import axios from 'axios'

export interface APIResponse {
  status: 'success' | 'error'
  message: string
  data?: { user_id: string; username: string; created_at: string }
  errors?: Record<string, string[]>
}

export interface RegisterPayload {
  first_name: string
  last_name: string
  mobile_number: string
  matric_number: string
  password: string
  confirm_password: string
}

const baseURL = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api/v1').replace(/\/+$/, '')

export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export function registerStudent(payload: RegisterPayload) {
  return api.post<APIResponse>('/auth/register/', payload)
}