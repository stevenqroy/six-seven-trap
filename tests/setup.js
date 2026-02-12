/**
 * Vitest setup file
 * Global test configuration and DOM mocks
 */

import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock;

// Mock window.location
global.window = {
  ...global.window,
  location: {
    origin: 'http://localhost',
    pathname: '/',
    search: '',
  },
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
