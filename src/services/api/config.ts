// URL base del backend POC — en producción apuntará a SAP OData
export const API_BASE_URL =
  typeof import.meta !== 'undefined'
    ? (import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:3001')
    : 'http://localhost:3001'
