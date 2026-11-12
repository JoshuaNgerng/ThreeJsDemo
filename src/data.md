# Data Loading: QueryClientProvider and DataGate

The app needs data from a Google Sheet before it can run. The data is loaded once per session and is not refreshed live. This document explains how the loading flow works.

## Overview

```
main.tsx
└── StrictMode
    └── QueryClientProvider   (provides the cache)
        └── DataGate          (loading / error / success)
            └── App
                └── PeriodicTable   (reads data with useSheetData)
```

| Piece | Responsibility |
|---|---|
| `fetchData()` | Fetches the sheet and validates headers and rows. Throws `SheetValidationError` if rows are invalid. |
| `QueryClientProvider` | Creates and shares the TanStack Query cache with the whole app. |
| `useSheetQuery()` | Runs `fetchData` through TanStack Query and returns `data`, `error`, `isFetching`, `refetch`. |
| `DataGate` | Shows a loading screen, an error screen with Retry, or renders the app. |
| `useSheetData()` | Returns the loaded data (never `undefined`) for components inside the gate. |

## How it works

### 1. QueryClientProvider

`QueryClientProvider` makes a single `QueryClient` available to every component below it. The client holds the cache, keyed by `queryKey`. Any component that calls `useQuery({ queryKey: ["sheet"], ... })` shares the same cached result and the same in-flight request.

Create the client **outside** any component so it isn't recreated on re-render, which would wipe the cache:

```tsx
const queryClient = new QueryClient();
```

### 2. The query

```ts
useQuery({
  queryKey: ["sheet"],
  queryFn: () => fetchData(),
  staleTime: Infinity, // data never becomes stale, so no background refetch
  gcTime: Infinity,    // cache is never garbage collected during the session
  retry: (count, error) =>
    !(error instanceof SheetValidationError) && count < 2,
});
```

- `staleTime: Infinity` and `gcTime: Infinity` give the "load once per session" behavior.
- Network errors are retried automatically up to 2 times.
- Validation errors are **not** retried, because a bad sheet won't fix itself. The error screen appears immediately.

### 3. DataGate

`DataGate` reads the query state and decides what to render:

| State | What the user sees |
|---|---|
| `isFetching && !data` | Loading screen (first load and during Retry) |
| `error` | Error screen with details and a **Retry** button |
| Data loaded | The children (`App`) |

On the error screen:

- A `SheetValidationError` lists the problems (row, field, message), showing the first 10.
- Any other error shows its message.
- **Retry** calls `refetch()`, which switches back to the loading screen.

`isFetching` is used instead of `isLoading` because `isLoading` is `false` when retrying after a failure, so the loading screen wouldn't reappear.

### 4. Reading data in components

Components inside the gate call:

```tsx
const rows = useSheetData(); // ElementData[]
```

The gate guarantees data exists, so there are no loading or error checks in components. If the hook is used outside `<DataGate>`, it throws a clear error.

## Setup

```bash
npm i @tanstack/react-query
```

```tsx
// main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { DataGate } from "./components/DataGate";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DataGate>
        <App />
      </DataGate>
    </QueryClientProvider>
  </StrictMode>
);
```

## Notes

- **StrictMode:** keep it. It only affects development. Effects and renders run twice in dev, but TanStack Query deduplicates the request, so only one network call is made.
- **Order matters:** `QueryClientProvider` must wrap `DataGate`, because the gate uses the query hook.
- **API key:** the Google Sheets API key is visible in the browser. Restrict it in Google Cloud Console (HTTP referrer and Sheets API only) and keep the sheet as public view-only.
- **Common errors:** a `403` usually means the sheet isn't shared publicly or the key restrictions don't match. A `400` usually means a bad range or sheet name.
- **Adding more data sources:** create another `useQuery` with a different `queryKey` and, if needed, include it in the gate.