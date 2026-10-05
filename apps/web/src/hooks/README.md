# hooks

All server state and the SSE lifecycle. Cache keys: `['session']`, `['cities']`, `['trips']`, `['trip', id]`, `['shared', token]`.

| File               | Exports                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAuth.ts`       | `useSession`, `useSignIn`, `useSignUp`, `useSignOut` (clears cached data on auth changes).                                                                                       |
| `useTrips.ts`      | `useCities`, `useTrips`, `useTrip`, `useSharedTrip`, `useCreateTrip`, `useDeleteTrip`, `useRegenerateTrip`, `useShareTrip`, `useUpdateStops`, `useSuggestions`, `useRefineTrip`. |
| `useTripEditor.ts` | Manual edits (move, remove, add, swap) as one save of the ordered stop list, with an Undo toast.                                                                                 |
| `useTripStream.ts` | Native `EventSource` reducer for status, tokens, and the terminal event; refreshes trip caches when done.                                                                        |

The API replays a trip's terminal event on connect, so the stream is safe to open at any time.
