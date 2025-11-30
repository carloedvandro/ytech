import { useState, useEffect } from "react";

export const GlobalDebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Ler logs do localStorage a cada 500ms
    const interval = setInterval(() => {
      const storedLogs = localStorage.getItem('debug-logs');
      if (storedLogs) {
        try {
          const parsedLogs = JSON.parse(storedLogs);
          setLogs(parsedLogs);
        } catch (e) {
          console.error('Erro ao parsear logs:', e);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Botão sempre visível */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 999999,
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}
      >
        🐛 DEBUG ({logs.length})
      </button>

      {/* Painel de debug */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            zIndex: 999998,
            backgroundColor: 'rgba(0,0,0,0.9)',
            color: 'white',
            overflow: 'auto',
            padding: '20px'
          }}
        >
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Debug Logs ({logs.length})</h2>
            <button
              onClick={() => {
                localStorage.removeItem('debug-logs');
                setLogs([]);
              }}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Limpar
            </button>
          </div>
          
          <div style={{ 
            fontFamily: 'monospace', 
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {logs.length === 0 ? (
              <p>Nenhum log ainda...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ 
                  marginBottom: '8px', 
                  padding: '8px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '4px'
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};
