declare global {
    interface Window {
        __CONFIG__?: { API_BASE_URL?: string };
    }
}

export const API_BASE_URL: string =
    window.__CONFIG__?.API_BASE_URL ?? "http://localhost:8080";