import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

let abertos = 0;

// Painel que sobe de baixo no celular e vira diálogo centralizado no PC.
export function Sheet({ aberto, onFechar, titulo, children, rodape, alta = false }) {
  useEffect(() => {
    if (!aberto) return undefined;
    abertos += 1;
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onFechar?.();
    window.addEventListener('keydown', esc);
    return () => {
      abertos -= 1;
      if (abertos === 0) document.body.style.overflow = '';
      window.removeEventListener('keydown', esc);
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return createPortal(
    <div className="sheet-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar?.()}>
      <div className={`sheet ${alta ? 'sheet-alta' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="sheet-alca" />
        <div className="sheet-cabecalho">
          <h2>{titulo}</h2>
          <button type="button" className="icon-btn" onClick={onFechar} aria-label="Fechar">
            <X size={22} />
          </button>
        </div>
        <div className="sheet-corpo">{children}</div>
        {rodape && <div className="sheet-rodape">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}

// Confirmação simples ("Tem certeza?").
export function Confirmar({ aberto, titulo, children, textoConfirmar = 'Confirmar', perigo, carregando, onConfirmar, onCancelar }) {
  return (
    <Sheet
      aberto={aberto}
      onFechar={onCancelar}
      titulo={titulo}
      rodape={
        <>
          <button type="button" className="btn btn-contorno" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </button>
          <button
            type="button"
            className={`btn ${perigo ? 'btn-escuro' : 'btn-primario'}`}
            onClick={onConfirmar}
            disabled={carregando}
          >
            {carregando ? 'Aguarde…' : textoConfirmar}
          </button>
        </>
      }
    >
      {children}
    </Sheet>
  );
}
