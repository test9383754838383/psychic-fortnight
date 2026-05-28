import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false, // Prevents aggressive background refreshing
      retry: 1, // Only retry failed requests once
    },
  },
});
