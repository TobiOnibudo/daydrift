# hooks

All server state and the SSE lifecycle. Cache keys: `['session']`, `['cities']`, `['trips']`, `['trip', id]`, `['shared', token]`.

| File               | Exports                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `useAuth.ts`       | `useSession`, `useSignIn`, `useSignUp`, `useSignOut` (clears cached data on auth changes).                                  |
| `useTrips.ts`      | `useCities`, `useTrips`, `useTrip`, `useSharedTrip`, `useCreateTrip`, `useDeleteTrip`, `useRegenerateTrip`, `useShareTrip`. |
| `useTripStream.ts` | Native `EventSource` reducer for status, tokens, and the terminal event; refreshes trip caches when done.                   |

The API replays a trip's terminal event on connect, so the stream is safe to open at any time.
