import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// jsdom lacks these; components that observe size or match media need harmless stand-ins.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }) as MediaQueryList;
}

window.scrollTo = () => undefined;

// Harmless stand-ins for the observers that figures and maps rely on.
class StubObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  Object.assign(globalThis, { IntersectionObserver: StubObserver });
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.assign(globalThis, { ResizeObserver: StubObserver });
}
