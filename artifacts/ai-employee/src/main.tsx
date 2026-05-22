import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0a0a0a',
            color: '#fff',
            fontFamily: 'monospace',
            padding: '2rem',
            flexDirection: 'column',
            gap: '1rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#f87171', fontSize: '1.5rem' }}>App Startup Error</h1>
          <p style={{ color: '#fca5a5', maxWidth: '600px' }}>{err.message}</p>
          <pre
            style={{
              background: '#1a1a1a',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: '#86efac',
              maxWidth: '800px',
              overflow: 'auto',
              textAlign: 'left',
            }}
          >
            {err.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
