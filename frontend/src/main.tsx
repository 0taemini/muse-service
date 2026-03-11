import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from '@app/providers/query-provider';
import { RouterProvider } from 'react-router-dom';
import { router } from '@app/router';
import '@app/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </React.StrictMode>,
);