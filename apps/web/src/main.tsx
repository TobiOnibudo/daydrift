import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createQueryClient } from './lib/query-client';
import './styles/index.css';

const queryClient = createQueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* "user" makes Framer Motion honor prefers-reduced-motion everywhere. */}
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster position="bottom-right" closeButton />
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
