import { RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import router from './routes';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider } from './lib/auth/AuthContext';

// Lazy: the toast system pulls in framer-motion. Deferring it keeps the
// motion vendor chunk out of the critical path — toasts only fire on user
// actions, never during first paint.
const ToastManager = lazy(() => import('./components/ToastManager.jsx'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Suspense fallback={null}>
          <ToastManager />
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;