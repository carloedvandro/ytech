import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Salvar erro no localStorage para debug
    try {
      const existingLogs = localStorage.getItem('debug-logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(`[ERRO REACT] ${new Date().toLocaleTimeString()} - ${error.message}`);
      logs.push(`[STACK] ${error.stack?.substring(0, 200)}`);
      localStorage.setItem('debug-logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }

    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    
    // Salvar info adicional no localStorage
    try {
      const existingLogs = localStorage.getItem('debug-logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(`[COMPONENT STACK] ${errorInfo.componentStack?.substring(0, 200)}`);
      localStorage.setItem('debug-logs', JSON.stringify(logs));
    } catch (e) {
      console.error('Erro ao salvar info adicional:', e);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#fee',
          border: '2px solid #f00',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h2 style={{ color: '#c00' }}>❌ Erro na Aplicação</h2>
          <p>Algo deu errado. Veja os detalhes no painel de debug.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Ver detalhes do erro
            </summary>
            <p style={{ color: '#c00', fontSize: '12px', marginTop: '10px' }}>
              {this.state.error && this.state.error.toString()}
            </p>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '10px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </p>
          </details>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
