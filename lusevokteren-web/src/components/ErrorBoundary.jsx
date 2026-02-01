import { Component } from 'react';

/**
 * ErrorBoundary - Fanger opp JavaScript-feil i React-komponenttreet
 *
 * Viser en brukervennlig feilmelding istedenfor hvit skjerm ved krasj.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Logg feilen (kan utvides til å sende til feilrapporteringstjeneste)
    console.error('ErrorBoundary fanget en feil:', error, errorInfo);

    // Lagre feilinfo for debugging
    try {
      const errorLog = {
        message: error.message,
        code: error.code || 'UNKNOWN',
        requestId: error.requestId || null,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };
      localStorage.setItem('fjordvind_last_error', JSON.stringify(errorLog));
    } catch (e) {
      // Ignorer lagringsfeil
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-dark, #0f172a)',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center',
            color: 'var(--text-primary, #e2e8f0)'
          }}>
            {/* Ikon */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '12px',
              color: 'var(--text-primary, #e2e8f0)'
            }}>
              Noe gikk galt
            </h1>

            <p style={{
              color: 'var(--text-secondary, #94a3b8)',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              Det oppstod en uventet feil. Prøv å laste siden på nytt,
              eller gå tilbake til forsiden.
            </p>

            {/* Request ID for support */}
            {this.state.error?.requestId && (
              <div style={{
                marginBottom: '16px',
                padding: '8px 16px',
                background: 'rgba(100, 116, 139, 0.1)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--text-secondary, #94a3b8)'
              }}>
                Feil-ID: <code style={{ fontFamily: 'monospace' }}>{this.state.error.requestId}</code>
              </div>
            )}

            {/* Feildetaljer i utviklingsmodus */}
            {isDev && this.state.error && (
              <div style={{
                textAlign: 'left',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                fontSize: '13px',
                fontFamily: 'monospace',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <div style={{
                  color: '#ef4444',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  {this.state.error.message}
                </div>
                {this.state.error.code && (
                  <div style={{ marginBottom: '8px', color: '#f59e0b' }}>
                    Kode: {this.state.error.code}
                  </div>
                )}
                {this.state.errorInfo && (
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-secondary, #94a3b8)',
                    fontSize: '11px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Handlingsknapper */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  background: 'var(--primary, #1565c0)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#1976d2'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary, #1565c0)'}
              >
                Last inn på nytt
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #94a3b8)',
                  border: '1px solid var(--border, #334155)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'var(--text-primary, #e2e8f0)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
                }}
              >
                Gå til forsiden
              </button>
            </div>

            {/* FjordVind branding */}
            <div style={{
              marginTop: '48px',
              opacity: 0.5
            }}>
              <svg viewBox="0 0 100 100" style={{ width: '32px', height: '32px' }}>
                <path d="M15 65 L32 35 L50 50 L70 22" stroke="#1e40af" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 78 L45 78" stroke="#3b82f6" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                <path d="M35 88 L85 88" stroke="#93c5fd" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
