import { createAuthClient } from "better-auth/react"

// Use relative baseURL so requests are same-origin and go through Vite proxy
export const authClient = createAuthClient({
    baseURL: "",
})


