import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

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
