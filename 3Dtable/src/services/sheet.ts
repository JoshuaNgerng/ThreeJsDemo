import { GOOGLE_SHEETS_CONFIG } from "../config/google-sheet"
import type { ElementData } from "../types/elements";

interface ValidationError {
    row: number;
    field: string;
    message: string;
}

interface RowValidationResult<T> {
    data: T | null;
    errors: ValidationError[];
}


export class SheetValidationError extends Error {

    public errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        super(`${errors.length} validation error(s) found in Google Sheet`);

        this.name = "SheetValidationError";
        this.errors = errors;
    }
}

interface GoogleSheetsResponse {
    values?: string[][];
}

export async function fetchData(signal?: AbortSignal): Promise<ElementData[]> {
  const { spreadsheetId, apiKey } = GOOGLE_SHEETS_CONFIG;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DataTemplate!A1:Z1000?key=${apiKey}`
  const response = await fetch(
      url,
      { signal }
  );

  if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const result: GoogleSheetsResponse = await response.json();

  if (!result.values || result.values.length === 0) {
      throw new Error("Google Sheet is empty");
  }

  // Validate headers
  const rawHeaders = result.values[0];
  const headers = validateHeaders(rawHeaders);

  const rows: ElementData[] = [];
  const errors: ValidationError[] = [];

  // Validate each row
  result.values.slice(1).forEach((row, index) => {
    if (row.every(cell => !cell?.trim())) return; // skip blank rows

    const checkRow = validateRow(headers, row, index + 2, columnSchema);
    if (checkRow.errors.length > 0) errors.push(...checkRow.errors);
    else if (checkRow.data) rows.push(checkRow.data);
  });

  // Throw all validation errors together
  if (errors.length > 0) {
      throw new SheetValidationError(errors);
  }

  return rows;
}

const validators = {
  string: (value: string): string => {
    const result = value.trim();

    if (!result) {
        throw new Error("Required field");
    }

    return result;
  },

  url: (value: string): string => {
    const result = value.trim();
    try { 
      new URL(result) 
    } catch { 
      throw new Error("Invalid URL") 
    }
    return result
  },

  numbers: (value: string): number => {
    const result = Number(value.replace(/,/g, ""));

    if (!value.trim() || !Number.isFinite(result)) {
        throw new Error("Invalid number");
    }

    return result;
  },

  age: (value: string) => {
    const n = validators.numbers(value);

    if (!Number.isInteger(n) || n < 0 || n > 150) throw new Error("Invalid age");

    return n;
  },

  money: (value: string): number => {
    const result = Number(value.replace(/[$,\s]/g, ""));

    if (!value.trim() || !Number.isFinite(result)) {
        throw new Error("Invalid number");
    }

    return result;  
  }
}

type ColumnConfig<T> = {
    field: keyof T;
    validator: (value: string) => unknown;
};

const columnSchema: Record<string, ColumnConfig<ElementData>> = {
  name: {
    field: "name",
    validator: validators.string
  },
  photo: {
    field: "photo",
    validator: validators.url,
  },
  age: {
    field: "age",
    validator: validators.age,
  },
  country: {
    field: "country",
    validator: validators.string,
  },
  interest: {
    field: "interest",
    validator: validators.string,
  },
  net_worth: {
    field: "networth",
    validator: validators.money,
  }
}

function normalizeHeader(header: string): string {
    return header
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function validateHeaders(rawHeaders: string[]): string[] {
    const headers = rawHeaders.map(normalizeHeader);
    
    const duplicates = headers.filter(
        (header, index) => headers.indexOf(header) !== index
    );
    
    if (duplicates.length) {
        throw new Error(
            `Duplicate headers found: ${[...new Set(duplicates)].join(", ")}`
        );
    }

    const expected = Object.keys(columnSchema);

    const missing = expected.filter(
        header => !headers.includes(header)
    );

    const unexpected = headers.filter(
        header => !expected.includes(header)
    );

    if (missing.length || unexpected.length) {
        throw new Error(
            `Invalid headers.
            Missing: ${missing.join(", ")}
            Unexpected: ${unexpected.join(", ")}`
        );
    }
    return headers
}

function validateRow<T>(
    headers: string[],
    row: string[],
    rowNumber: number,
    schema: Record<string, ColumnConfig<T>>
): RowValidationResult<T> {

    const result: Partial<T> = {};
    const errors: ValidationError[] = [];

    headers.forEach((header, index) => {

        const config = schema[header];

        // Skip unexpected columns
        if (!config) return;

        const value = row[index] ?? "";

        try {
            const validatedValue = config.validator(value);

            // Assign validated value to the correct property
            Object.assign(result, {
                [config.field]: validatedValue
            });

        } catch (error) {

            errors.push({
                row: rowNumber,
                field: header,
                message: error instanceof Error
                    ? error.message
                    : "Invalid value"
            });
        }
    });

    return {
        data: errors.length === 0
            ? result as T
            : null,
        errors
    };
}
