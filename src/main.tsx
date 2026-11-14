import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from './app/providers';
import { router } from './app/router';
import { restoreAppearance } from './shared/utils/theme';
import './shared/styles/index.css';

restoreAppearance();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
