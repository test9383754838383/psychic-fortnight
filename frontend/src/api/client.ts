import createClient from "openapi-fetch";
import type { paths } from "./schema.ts";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? (typeof process !== "undefined" && process.env.NODE_ENV === "test" ? "http://localhost:3000" : "");

export const apiClient = createClient<paths>({
  baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
});
