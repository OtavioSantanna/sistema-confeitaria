import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Pagina } from '../../components/Layout.jsx';
import { Confirmar } from '../../components/Sheet.jsx';
import { useToast } from '../../components/Toast.jsx';
import { produtos } from '../../api/index.js';
import { ProdutoForm } from './ProdutoForm.jsx';

export function ProdutoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [excluir, setExcluir] = useState(false);
  const voltar = '/receitas?aba=produtos';

  async function desativar() {
    try {
      await produtos.desativar(id);
      toast.ok('Produto removido do catálogo');
      navigate(voltar, { replace: true });
    } catch (e) {
      toast.erro(e);
    }
  }

  return (
    <Pagina titulo={id ? 'Editar produto' : 'Novo produto'} voltar={voltar}
      acoes={id && (
        <button type="button" className="icon-btn" aria-label="Remover produto" onClick={() => setExcluir(true)}><Trash2 size={20} /></button>
      )}>
      <ProdutoForm key={id ?? 'novo'} produtoId={id ? Number(id) : undefined} onSalvo={() => navigate(voltar, { replace: true })} />
      <Confirmar aberto={excluir} titulo="Remover produto?" textoConfirmar="Remover" perigo
        onCancelar={() => setExcluir(false)} onConfirmar={desativar}>
        <p>O produto sai do catálogo. Encomendas antigas não são afetadas.</p>
      </Confirmar>
    </Pagina>
  );
}
