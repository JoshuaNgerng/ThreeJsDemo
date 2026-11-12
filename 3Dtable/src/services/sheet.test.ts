import { describe, expect, it, vi } from 'vitest';
import { fetchData, SheetValidationError } from './sheet';

const HEADERS = ['Name', 'Photo', 'Age', 'Country', 'Interest', 'Net Worth'];
const ALEX = ['Alex', 'https://example.com/a.jpg', '30', 'MY', 'Chess', '$1,200,500'];
const BO = ['Bo', 'http://example.com/b.png', '41', 'SG', 'Golf', '50000'];

/** Replace global fetch with a fake that returns the given sheet values. */
function mockSheet(values: string[][] | undefined, init: { ok?: boolean; status?: number } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => ({ values }),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Run fetchData and return whatever it rejects with. */
async function failure(): Promise<unknown> {
  return fetchData().then(
    () => { throw new Error('expected fetchData to reject'); },
    (e: unknown) => e,
  );
}

describe('fetchData: request', () => {
  it('calls the Sheets values endpoint for the DataTemplate tab with a key', async () => {
    const fetchMock = mockSheet([HEADERS, ALEX]);

    await fetchData();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('https://sheets.googleapis.com/v4/spreadsheets/');
    expect(url).toContain('/values/DataTemplate!A1:Z1000');
    expect(url).toContain('key=');
  });

  it('passes the abort signal through to fetch', async () => {
    const fetchMock = mockSheet([HEADERS, ALEX]);
    const controller = new AbortController();

    await fetchData(controller.signal);

    expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });
});

describe('fetchData: parsing', () => {
  it('maps valid rows to ElementData with the right types', async () => {
    mockSheet([HEADERS, ALEX, BO]);

    await expect(fetchData()).resolves.toEqual([
      { name: 'Alex', photo: 'https://example.com/a.jpg', age: 30, country: 'MY', interest: 'Chess', networth: 1200500 },
      { name: 'Bo', photo: 'http://example.com/b.png', age: 41, country: 'SG', interest: 'Golf', networth: 50000 },
    ]);
  });

  it('skips fully blank rows', async () => {
    mockSheet([HEADERS, ALEX, ['', '', '', '', '', ''], BO]);

    const rows = await fetchData();

    expect(rows.map((r) => r.name)).toEqual(['Alex', 'Bo']);
  });

  it('trims whitespace and accepts money with $, commas and spaces', async () => {
    mockSheet([HEADERS, ['  Alex  ', 'https://example.com/a.jpg', ' 30 ', 'MY ', 'Chess', '1 234']]);

    const [row] = await fetchData();

    expect(row).toMatchObject({ name: 'Alex', age: 30, country: 'MY', networth: 1234 });
  });

  it('accepts headers in any case and with spaces', async () => {
    mockSheet([['NAME', ' photo ', 'Age', 'COUNTRY', 'interest', 'net worth'], ALEX]);

    await expect(fetchData()).resolves.toHaveLength(1);
  });

  it('accepts columns in a different order', async () => {
    mockSheet([
      ['net_worth', 'interest', 'country', 'age', 'photo', 'name'],
      ['100', 'Chess', 'MY', '30', 'https://example.com/a.jpg', 'Alex'],
    ]);

    const [row] = await fetchData();

    expect(row).toMatchObject({ name: 'Alex', networth: 100, interest: 'Chess' });
  });
});

describe('fetchData: failures before row validation', () => {
  it('throws on a non-OK HTTP response', async () => {
    mockSheet(undefined, { ok: false, status: 500 });

    await expect(fetchData()).rejects.toThrow('Google Sheets API error: 500');
  });

  it('throws when the sheet has no values', async () => {
    mockSheet(undefined);
    await expect(fetchData()).rejects.toThrow('Google Sheet is empty');

    mockSheet([]);
    await expect(fetchData()).rejects.toThrow('Google Sheet is empty');
  });

  it('rejects a missing header', async () => {
    mockSheet([['Name', 'Photo', 'Age', 'Country', 'Interest'], ALEX.slice(0, 5)]);

    await expect(fetchData()).rejects.toThrow(/Missing: net_worth/);
  });

  it('rejects an unexpected header', async () => {
    mockSheet([[...HEADERS, 'Extra'], [...ALEX, 'x']]);

    await expect(fetchData()).rejects.toThrow(/Unexpected: extra/);
  });

  it('rejects duplicate headers', async () => {
    mockSheet([[...HEADERS.slice(0, 5), 'Name'], ALEX]);

    await expect(fetchData()).rejects.toThrow(/Duplicate headers found: name/);
  });
});

describe('fetchData: row validation', () => {
  it('collects every problem, with sheet row numbers (header is row 1)', async () => {
    mockSheet([
      HEADERS,
      ['', 'not a url', 'abc', 'MY', 'Chess', 'x'],            // sheet row 2: four problems
      ['Ok', 'https://example.com/c.jpg', '-5', 'MY', 'Chess', '10'], // sheet row 3: bad age
    ]);

    const error = await failure();

    expect(error).toBeInstanceOf(SheetValidationError);
    expect((error as SheetValidationError).errors).toEqual([
      { row: 2, field: 'name', message: 'Required field' },
      { row: 2, field: 'photo', message: 'Invalid URL' },
      { row: 2, field: 'age', message: 'Invalid number' },
      { row: 2, field: 'net_worth', message: 'Invalid number' },
      { row: 3, field: 'age', message: 'Invalid age' },
    ]);
  });

  it('rejects ages that are fractional or above 150', async () => {
    mockSheet([
      HEADERS,
      ['A', 'https://example.com/a.jpg', '150.5', 'MY', 'C', '1'],
      ['B', 'https://example.com/a.jpg', '151', 'MY', 'C', '1'],
    ]);

    const error = (await failure()) as SheetValidationError;

    expect(error.errors.map((e) => e.message)).toEqual(['Invalid age', 'Invalid age']);
  });

  it('treats cells missing from a short row as empty', async () => {
    mockSheet([HEADERS, ['Alex', 'https://example.com/a.jpg', '30']]);

    const error = (await failure()) as SheetValidationError;

    expect(error.errors.map((e) => e.field)).toEqual(['country', 'interest', 'net_worth']);
  });

  it('reports the number of problems in the error message', async () => {
    mockSheet([HEADERS, ['', 'x', 'x', '', '', 'x']]);

    const error = (await failure()) as SheetValidationError;

    expect(error.message).toBe(`${error.errors.length} validation error(s) found in Google Sheet`);
    expect(error.name).toBe('SheetValidationError');
  });
});
