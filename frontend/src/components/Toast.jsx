import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const mostrar = useCallback((mensagem, { tipo = 'info', detalhes = [], duracao = 2800 } = {}) => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-1), { id, mensagem, tipo, detalhes }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duracao + detalhes.length * 1500);
  }, []);

  const api = {
    ok: (m) => mostrar(m, { tipo: 'ok' }),
    info: (m) => mostrar(m),
    // Aceita um ApiError (com detalhes) ou texto.
    erro: (e) => mostrar(e?.message ?? String(e), { tipo: 'erro', detalhes: e?.detalhes ?? [], duracao: 5000 }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`} title="Toque para fechar"
            onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}>
            {t.mensagem}
            {t.detalhes.length > 0 && (
              <ul>
                {t.detalhes.slice(0, 5).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
