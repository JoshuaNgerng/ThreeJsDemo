import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchData, SheetValidationError } from '../services/sheet';
import type { ElementData } from '../types/elements';
import { useSheetData, useSheetQuery } from './useSheetData';

// Keep the real SheetValidationError class, fake only the network call.
vi.mock('../services/sheet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/sheet')>();
  return { ...actual, fetchData: vi.fn() };
});

const person: ElementData = {
  photo: 'https://example.com/a.jpg',
  name: 'Alex',
  country: 'MY',
  interest: 'Chess',
  age: 30,
  networth: 1000,
};

/** A fresh cache per test, with instant retries so failure tests run fast. */
function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.mocked(fetchData).mockReset();
});

describe('useSheetQuery', () => {
  it('returns the fetched data', async () => {
    vi.mocked(fetchData).mockResolvedValue([person]);

    const { result } = renderHook(() => useSheetQuery(), { wrapper: wrapperFor(createClient()) });

    await waitFor(() => expect(result.current.data).toEqual([person]));
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('does not retry validation errors (retrying cannot fix bad data)', async () => {
    vi.mocked(fetchData).mockRejectedValue(
      new SheetValidationError([{ row: 2, field: 'name', message: 'Required field' }]),
    );

    const { result } = renderHook(() => useSheetQuery(), { wrapper: wrapperFor(createClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(SheetValidationError);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('retries other errors twice before giving up (3 calls in total)', async () => {
    vi.mocked(fetchData).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useSheetQuery(), { wrapper: wrapperFor(createClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(fetchData).toHaveBeenCalledTimes(3);
  });

  it('never refetches data that is already cached (staleTime is Infinity)', async () => {
    const client = createClient();
    client.setQueryData(['sheet'], [person]);

    const { result } = renderHook(() => useSheetQuery(), { wrapper: wrapperFor(client) });

    expect(result.current.data).toEqual([person]);
    expect(fetchData).not.toHaveBeenCalled();
  });
});

describe('useSheetData', () => {
  it('returns the data when it is already loaded', () => {
    const client = createClient();
    client.setQueryData(['sheet'], [person]);

    const { result } = renderHook(() => useSheetData(), { wrapper: wrapperFor(client) });

    expect(result.current).toEqual([person]);
  });

  it('throws if the data does not exist yet (used outside <DataGate>)', () => {
    vi.mocked(fetchData).mockReturnValue(new Promise(() => {}));   // never resolves
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSheetData(), { wrapper: wrapperFor(createClient()) })).toThrow(
      'useSheetData used outside <DataGate>',
    );

    consoleError.mockRestore();
  });
});
