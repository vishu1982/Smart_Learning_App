import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('React crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f8fafc', fontFamily: 'monospace', padding: '2rem'
        }}>
          <div style={{
            maxWidth: '700px', width: '100%',
            background: '#fff', border: '2px solid #fca5a5', borderRadius: '16px', padding: '2rem'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️ Application Error</div>
            <p style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1rem', marginBottom: '1rem' }}>
              {this.state.error?.message || 'Unknown error'}
            </p>
            <pre style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
              padding: '1rem', fontSize: '0.75rem', overflowX: 'auto',
              color: '#7f1d1d', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {this.state.error?.stack}
            </pre>
            {this.state.info && (
              <pre style={{
                marginTop: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: '8px', padding: '1rem', fontSize: '0.75rem',
                overflowX: 'auto', color: '#0c4a6e', whiteSpace: 'pre-wrap'
              }}>
                {this.state.info.componentStack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem', padding: '0.75rem 2rem',
                background: '#4f46e5', color: 'white', border: 'none',
                borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem'
              }}
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
