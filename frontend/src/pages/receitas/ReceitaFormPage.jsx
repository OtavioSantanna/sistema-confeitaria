import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Pagina } from '../../components/Layout.jsx';
import { Confirmar } from '../../components/Sheet.jsx';
import { useToast } from '../../components/Toast.jsx';
import { receitas } from '../../api/index.js';
import { ReceitaForm } from './ReceitaForm.jsx';

export function ReceitaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [excluir, setExcluir] = useState(false);

  async function desativar() {
    try {
      await receitas.desativar(id);
      toast.ok('Receita removida');
      navigate('/receitas', { replace: true });
    } catch (e) {
      toast.erro(e);
    }
  }

  return (
    <Pagina
      titulo={id ? 'Editar receita' : 'Nova receita'}
      voltar="/receitas"
      acoes={id && (
        <button type="button" className="icon-btn" aria-label="Remover receita" onClick={() => setExcluir(true)}>
          <Trash2 size={20} />
        </button>
      )}
    >
      <ReceitaForm key={id ?? 'nova'} receitaId={id ? Number(id) : undefined}
        onSalvo={() => navigate('/receitas', { replace: true })} />
      <Confirmar aberto={excluir} titulo="Remover receita?" textoConfirmar="Remover" perigo
        onCancelar={() => setExcluir(false)} onConfirmar={desativar}>
        <p>A receita sai da lista. Encomendas antigas continuam com os cálculos já feitos.</p>
      </Confirmar>
    </Pagina>
  );
}
