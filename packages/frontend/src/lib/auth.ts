import { createAuthClient } from "better-auth/react"

// Use absolute baseURL in production, relative in dev (Vite proxy)
const base = (import.meta as any).env?.VITE_BACKEND_URL || "https://api-rootine.bardemic.com";
export const authClient = createAuthClient({
    baseURL: base,
})


