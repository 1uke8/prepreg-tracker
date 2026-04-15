import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Cache data for 5 minutes before considering it stale.
			// Prevents re-fetching when navigating between pages.
			staleTime: 5 * 60 * 1000,
			// Keep unused query data in memory for 10 minutes.
			gcTime: 10 * 60 * 1000,
		},
	},
});