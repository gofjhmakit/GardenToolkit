import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// Tests assert English UI text. The default language follows navigator.language, which Node
// derives from the machine's locale, so pin it — otherwise the suite fails on a Finnish system.
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
  Object.defineProperty(navigator, 'languages', { value: ['en-US', 'en'], configurable: true });
}

// jsdom gaps used by the UI.
if (typeof window !== 'undefined') {
  if (!('ResizeObserver' in window)) {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  const proto = window.HTMLDialogElement?.prototype;
  if (proto && !proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  }
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:test';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => undefined;
}

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
