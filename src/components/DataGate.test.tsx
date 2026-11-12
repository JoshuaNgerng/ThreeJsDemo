import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSheetQuery } from '../hooks/useSheetData';
import { SheetValidationError } from '../services/sheet';
import { DataGate } from './DataGate';

vi.mock('../hooks/useSheetData', () => ({ useSheetQuery: vi.fn() }));

type QueryResult = ReturnType<typeof useSheetQuery>;

/** Make useSheetQuery return the given state (everything else is a sensible default). */
function mockQuery(state: Partial<{ data: unknown; error: Error | null; isFetching: boolean; refetch: () => void }>) {
  vi.mocked(useSheetQuery).mockReturnValue({
    data: undefined,
    error: null,
    isFetching: false,
    refetch: vi.fn(),
    ...state,
  } as unknown as QueryResult);
}

function renderGate() {
  return render(
    <DataGate>
      <p>the app</p>
    </DataGate>,
  );
}

beforeEach(() => {
  vi.mocked(useSheetQuery).mockReset();
});

describe('DataGate', () => {
  it('shows a loading screen while the first fetch is running', () => {
    mockQuery({ isFetching: true });
    renderGate();

    expect(screen.getByText('Loading data…')).toBeInTheDocument();
    expect(screen.queryByText('the app')).not.toBeInTheDocument();
  });

  it('renders the children once data has loaded', () => {
    mockQuery({ data: [{ name: 'Alex' }] });
    renderGate();

    expect(screen.getByText('the app')).toBeInTheDocument();
    expect(screen.queryByText('Loading data…')).not.toBeInTheDocument();
  });

  it('shows the message for a generic error, and Retry calls refetch', async () => {
    const refetch = vi.fn();
    const user = userEvent.setup();
    mockQuery({ error: new Error('Google Sheets API error: 403'), refetch });
    renderGate();

    expect(screen.getByRole('heading', { name: "Couldn't load data" })).toBeInTheDocument();
    expect(screen.getByText('Google Sheets API error: 403')).toBeInTheDocument();
    expect(screen.queryByText('the app')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('lists the problem rows for a validation error', () => {
    mockQuery({
      error: new SheetValidationError([
        { row: 2, field: 'name', message: 'Required field' },
        { row: 5, field: 'age', message: 'Invalid age' },
      ]),
    });
    renderGate();

    expect(screen.getByText('The sheet has 2 problem(s):')).toBeInTheDocument();
    expect(screen.getByText('Row 2, name: Required field')).toBeInTheDocument();
    expect(screen.getByText('Row 5, age: Invalid age')).toBeInTheDocument();
  });

  it('shows only the first 10 problems and counts the rest', () => {
    const errors = Array.from({ length: 12 }, (_, i) => ({ row: i + 2, field: 'age', message: 'Invalid age' }));
    mockQuery({ error: new SheetValidationError(errors) });
    renderGate();

    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('…and 2 more.')).toBeInTheDocument();
  });
});
