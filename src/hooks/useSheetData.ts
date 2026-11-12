import { useQuery } from "@tanstack/react-query";
import { fetchData, SheetValidationError } from "../services/sheet";

export function useSheetQuery() {
  return useQuery({
    queryKey: ["sheet"],
    queryFn: ({ signal }) => fetchData(signal),
    staleTime: Infinity,   // never considered stale
    gcTime: Infinity,      // never garbage collected
    retry: (count, error) =>
      !(error instanceof SheetValidationError) && count < 2,
  });
}

// For components inside the gate, where data is guaranteed to exist
export function useSheetData() {
  const { data } = useSheetQuery();
  if (!data) throw new Error("useSheetData used outside <DataGate>");
  return data;
}
