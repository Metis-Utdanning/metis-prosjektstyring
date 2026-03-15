import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
          background: '#F4F1EC',
          fontFamily: "'Sora', system-ui, sans-serif",
          color: '#1c1917',
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>!</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Noe gikk galt
          </h1>
          <p style={{ fontSize: 14, color: '#78716c', marginBottom: 24, maxWidth: 400 }}>
            En uventet feil oppstod. Prøv å laste inn siden på nytt.
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: 11,
              color: '#a8a29e',
              background: '#f5f5f4',
              padding: '12px 16px',
              borderRadius: 8,
              maxWidth: 500,
              overflow: 'auto',
              marginBottom: 24,
              fontFamily: "'Fira Code', monospace",
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              padding: '10px 24px',
              background: '#4F46E5',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Last inn på nytt
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
