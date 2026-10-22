// URL base del backend POS. Vacía en pre_prod (build --mode preprod, .env.preprod):
// las llamadas van a /api/... del mismo servidor y vite preview las reenvía al
// backend (vite.config.ts). En desarrollo, http://localhost:3001.
// VITE_API_URL se acepta por compatibilidad (nombre antiguo de algunos servicios).
const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined
export const API_BASE_URL: string = env?.VITE_API_BASE_URL ?? env?.VITE_API_URL ?? 'http://localhost:3001'
