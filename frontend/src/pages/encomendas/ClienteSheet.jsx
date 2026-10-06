import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Sheet } from '../../components/Sheet.jsx';
import { ListaBusca } from '../../components/ListaBusca.jsx';
import { Campo } from '../../components/Campos.jsx';
import { Carregando } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { clientes } from '../../api/index.js';
import { iniciais } from '../../lib/format.js';

// Escolher cliente (com busca) ou cadastrar um novo na hora.
export function ClienteSheet({ aberto, onFechar, onSelecionar }) {
  const toast = useToast();
  const [lista, setLista] = useState(null);
  const [novo, setNovo] = useState(null); // { nome, telefone } quando cadastrando
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setNovo(null);
    clientes.listar({ ativo: true }).then(setLista).catch(toast.erro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  async function salvar() {
    setSalvando(true);
    try {
      const c = await clientes.criar({ nome: novo.nome, telefone: novo.telefone || null });
      toast.ok('Cliente cadastrado');
      onSelecionar(c);
    } catch (e) {
      toast.erro(e);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet
      aberto={aberto}
      onFechar={onFechar}
      titulo={novo ? 'Novo cliente' : 'Cliente'}
      alta={!novo}
      rodape={novo && (
        <>
          <button type="button" className="btn btn-contorno" onClick={() => setNovo(null)}>Voltar</button>
          <button type="button" className="btn btn-primario" disabled={!novo.nome.trim() || salvando} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Cadastrar'}
          </button>
        </>
      )}
    >
      {novo ? (
        <div className="form">
          <Campo rotulo="Nome">
            <input className="input" autoFocus value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </Campo>
          <Campo rotulo="Telefone / WhatsApp">
            <input className="input" type="tel" inputMode="tel" value={novo.telefone}
              onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} placeholder="(11) 90000-0000" />
          </Campo>
        </div>
      ) : lista ? (
        <ListaBusca
          itens={lista}
          texto={(c) => `${c.nome} ${c.telefone ?? ''}`}
          placeholder="Buscar por nome ou telefone…"
          onSelecionar={onSelecionar}
          acao={(termo) => (
            <button type="button" className="btn btn-contorno btn-bloco" onClick={() => setNovo({ nome: termo, telefone: '' })}>
              <UserPlus size={18} /> Cadastrar {termo ? `“${termo}”` : 'novo cliente'}
            </button>
          )}
          renderItem={(c) => (
            <>
              <span className="avatar">{iniciais(c.nome)}</span>
              <span className="cresce">
                <span className="negrito" style={{ display: 'block' }}>{c.nome}</span>
                {c.telefone && <span className="suave">{c.telefone}</span>}
              </span>
            </>
          )}
        />
      ) : (
        <Carregando />
      )}
    </Sheet>
  );
}
