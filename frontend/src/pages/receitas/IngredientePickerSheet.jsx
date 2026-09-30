import { useEffect, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Sheet } from '../../components/Sheet.jsx';
import { ListaBusca } from '../../components/ListaBusca.jsx';
import { Carregando } from '../../components/Estados.jsx';
import { useToast } from '../../components/Toast.jsx';
import { ingredientes } from '../../api/index.js';
import { iniciais, qtd } from '../../lib/format.js';
import { IngredienteFormSheet } from '../estoque/IngredienteFormSheet.jsx';

// Escolher ingrediente com busca; permite cadastrar um novo na hora.
// `excluir`: ids que não devem aparecer (já estão na receita).
export function IngredientePickerSheet({ aberto, onFechar, onSelecionar, excluir = [], titulo = 'Ingrediente', mostrarEstoque }) {
  const toast = useToast();
  const [lista, setLista] = useState(null);
  const [novo, setNovo] = useState(null); // nome sugerido

  useEffect(() => {
    if (!aberto) return;
    setLista(null);
    ingredientes.listar({ ativo: true }).then(setLista).catch(toast.erro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const itens = (lista ?? []).filter((i) => !excluir.includes(i.id));

  return (
    <>
      <Sheet aberto={aberto && novo === null} onFechar={onFechar} titulo={titulo} alta>
        {lista ? (
          <ListaBusca
            itens={itens}
            texto={(i) => i.nome}
            placeholder="Buscar ingrediente…"
            onSelecionar={onSelecionar}
            vazio="Não encontrou? Cadastre acima."
            acao={(termo) => (
              <button type="button" className="btn btn-contorno btn-bloco" onClick={() => setNovo(termo)}>
                <PackagePlus size={18} /> Cadastrar {termo ? `“${termo}”` : 'novo ingrediente'}
              </button>
            )}
            renderItem={(i) => (
              <>
                <span className="avatar">{iniciais(i.nome)}</span>
                <span className="cresce">
                  <span className="negrito" style={{ display: 'block' }}>{i.nome}</span>
                  <span className="suave">
                    {mostrarEstoque ? `Disponível: ${qtd(i.estoqueDisponivel, i.unidadeEstoque)}` : `Estoque em ${i.unidadeEstoque}`}
                  </span>
                </span>
              </>
            )}
          />
        ) : (
          <Carregando />
        )}
      </Sheet>
      <IngredienteFormSheet
        aberto={aberto && novo !== null}
        nomeInicial={novo ?? ''}
        onFechar={() => setNovo(null)}
        onSalvo={(ing) => { setNovo(null); onSelecionar(ing); }}
      />
    </>
  );
}
