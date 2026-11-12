import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();               // unmount anything rendered by the test
  vi.unstubAllGlobals();   // undo vi.stubGlobal (e.g. fetch)
});
