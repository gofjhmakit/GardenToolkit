import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles.css';
import './i18n';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Automation/debug hook used by the end-to-end tests to inspect state.
// Harmless in production: the app has no secrets and no server.
import { useEditor } from './editor/store';
import { usePlants } from './app/plantStore';
(window as unknown as { __gtk: unknown }).__gtk = { editor: useEditor, plants: usePlants };
