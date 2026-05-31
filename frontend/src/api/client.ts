import createClient from "openapi-fetch";
import type { paths } from "./schema.ts";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? (typeof process !== "undefined" && process.env.NODE_ENV === "test" ? (typeof window !== "undefined" ? window.location.origin : "http://localhost") : "");

export const apiClient = createClient<paths>({
  baseUrl,
  fetch: (...args) => (typeof window !== "undefined" ? window.fetch(...args) : globalThis.fetch(...args)),
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
});
