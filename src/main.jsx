import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

function AppRouter({ children }) {
  const useHashRouter = typeof window !== 'undefined' && window.location.protocol === 'file:';
  const Router = useHashRouter ? HashRouter : BrowserRouter;

  return <Router>{children}</Router>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter>
      <App />
    </AppRouter>
  </React.StrictMode>
);
