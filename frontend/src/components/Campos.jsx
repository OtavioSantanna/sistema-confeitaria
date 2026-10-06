import { Minus, Plus } from 'lucide-react';
import { parseDecimal } from '../lib/format.js';

export function Campo({ rotulo, dica, children }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {dica && <small>{dica}</small>}
    </label>
  );
}

// Campo de número decimal (aceita vírgula), com teclado numérico no celular.
export function InputNumero({ value, onChange, ...props }) {
  return (
    <input
      className="input"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ''))}
      {...props}
    />
  );
}

// − [ 3 ] +
export function Stepper({ value, onChange, passo = 1, min = 1, rotulo = 'Quantidade' }) {
  const n = Number(parseDecimal(value)) || 0;
  const muda = (d) => onChange(String(Math.max(min, +(n + d).toFixed(4))));
  return (
    <div className="stepper">
      <button type="button" onClick={() => muda(-passo)} aria-label="Diminuir" disabled={n <= min}>
        <Minus size={20} />
      </button>
      <input inputMode="decimal" value={value} aria-label={rotulo}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} />
      <button type="button" onClick={() => muda(passo)} aria-label="Aumentar">
        <Plus size={20} />
      </button>
    </div>
  );
}
