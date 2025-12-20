import React from 'react';

type Props = {
  children: React.ReactNode;
  /** Optional label shown in the fallback UI. */
  label?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

/**
 * PUBLIC_INTERFACE
 * Global React error boundary.
 *
 * Prevents a completely blank screen when a runtime exception occurs during rendering,
 * in lifecycle hooks, or in constructors of child components. Instead we show a small,
 * accessible fallback panel with the error message.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  /** This is a public component used at the application root. */
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Keep console logging minimal but useful for debugging blank-preview issues.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught error', error, info);
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        id="main"
        role="main"
        tabIndex={-1}
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'var(--bg-secondary)'
        }}
      >
        <section
          role="alert"
          aria-live="assertive"
          style={{
            width: '100%',
            maxWidth: 760,
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            background: 'var(--bg-primary)',
            padding: 20
          }}
        >
          <h1 className="title" style={{ marginTop: 0 }}>
            {this.props.label || 'Something went wrong'}
          </h1>
          <p className="description" style={{ marginBottom: 10 }}>
            The application hit an unrecoverable error while rendering. This is usually caused by missing environment
            configuration (API base URL) or an unexpected runtime exception.
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 10,
              padding: 12,
              margin: 0
            }}
          >
            {this.state.message}
          </pre>
          <p className="description" style={{ marginTop: 12 }}>
            Try refreshing the page. If this persists, verify environment variables like <code>VITE_API_BASE</code> or{' '}
            <code>REACT_APP_API_BASE</code>.
          </p>
        </section>
      </main>
    );
  }
}
