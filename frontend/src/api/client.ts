import createClient from "openapi-fetch";
import type { paths } from "./schema.ts";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const apiClient = createClient<paths>({
  baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});
