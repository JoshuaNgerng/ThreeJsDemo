import type { ReactNode } from "react";
import { useSheetQuery } from "../hooks/useSheetData";
import { SheetValidationError } from "../services/sheet";

export function DataGate({ children }: { children: ReactNode }) {
  const { data, error, isFetching, refetch } = useSheetQuery();

  // Show the loading screen on the first load and during a retry
  if (isFetching && !data) {
    return <div className="screen">Loading data…</div>;
  }

  if (error) {
    return (
      <div className="screen">
        <h2>Couldn't load data</h2>

        {error instanceof SheetValidationError ? (
          <>
            <p>The sheet has {error.errors.length} problem(s):</p>
            <ul>
              {error.errors.slice(0, 10).map((e, i) => (
                <li key={i}>
                  Row {e.row}, {e.field}: {e.message}
                </li>
              ))}
            </ul>
            {error.errors.length > 10 && (
              <p>…and {error.errors.length - 10} more.</p>
            )}
          </>
        ) : (
          <p>{error.message}</p>
        )}

        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return <>{children}</>;
}