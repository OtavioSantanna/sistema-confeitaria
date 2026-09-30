import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Cake, Candy, Plus, Search } from 'lucide-react';
import { Pagina } from '../../components/Layout.jsx';
import { Carregando, Erro, Vazio } from '../../components/Estados.jsx';
import { produtos, receitas } from '../../api/index.js';
import { useCarregar } from '../../hooks/useCarregar.js';
import { dinheiro, normalizar, num } from '../../lib/format.js';

function Busca({ valor, onChange, placeholder }) {
  return (
    <div className="busca" style={{ marginBottom: 14 }}>
      <Search size={18} />
      <input className="input" type="search" value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

function ListaReceitas() {
  const navigate = useNavigate();
  const [termo, setTermo] = useState('');
  const { dados, carregando, erro, recarregar } = useCarregar(() => receitas.listar({ ativo: true }), []);

  const grupos = useMemo(() => {
    const t = normalizar(termo);
    const m = new Map();
    for (const r of dados ?? []) {
      if (t && !normalizar(`${r.nome} ${r.tipoReceita}`).includes(t)) continue;
      if (!m.has(r.tipoReceita)) m.set(r.tipoReceita, []);
      m.get(r.tipoReceita).push(r);
    }
    return [...m.entries()];
  }, [dados, termo]);

  return (
    <>
      <Busca valor={termo} onChange={setTermo} placeholder="Buscar receita…" />
      {carregando && <Carregando />}
      {erro && <Erro erro={erro} onTentar={recarregar} />}
      {dados?.length === 0 && <Vazio icone={BookOpen} titulo="Nenhuma receita cadastrada">Toque em “Nova receita”.</Vazio>}
      {dados?.length > 0 && grupos.length === 0 && <p className="suave" style={{ textAlign: 'center', padding: 24 }}>Nada encontrado.</p>}
      {grupos.map(([tipo, lista]) => (
        <section key={tipo} className="secao" style={{ marginTop: 8, marginBottom: 18 }}>
          <div className="secao-titulo"><span>{tipo}</span><span>{lista.length}</span></div>
          <div className="lista lista-grade">
            {lista.map((r) => (
              <button key={r.id} type="button" className="card card-clicavel" onClick={() => navigate(`/receitas/${r.id}`)}>
                <p className="titulo-card">{r.nome}</p>
                <p className="suave">
                  Rende {num(r.rendimentoQuantidade)} {r.rendimentoUnidade} · {r.totalIngredientes} ingredientes
                </p>
              </button>
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="fab" onClick={() => navigate('/receitas/nova')}>
        <Plus size={22} /> Nova receita
      </button>
    </>
  );
}

function ListaProdutos() {
  const navigate = useNavigate();
  const [termo, setTermo] = useState('');
  const { dados, carregando, erro, recarregar } = useCarregar(() => produtos.listar({ ativo: true }), []);
  const filtrados = (dados ?? []).filter((p) => normalizar(p.nome).includes(normalizar(termo)));

  return (
    <>
      <Busca valor={termo} onChange={setTermo} placeholder="Buscar produto…" />
      {carregando && <Carregando />}
      {erro && <Erro erro={erro} onTentar={recarregar} />}
      {dados?.length === 0 && (
        <Vazio icone={Cake} titulo="Nenhum produto no catálogo">
          Produtos são o que a cliente encomenda (bolo, brigadeiro…). Cada um usa uma ou mais receitas.
        </Vazio>
      )}
      <div className="lista lista-grade">
        {filtrados.map((p) => (
          <button key={p.id} type="button" className="card card-clicavel" onClick={() => navigate(`/produtos/${p.id}`)}>
            <div className="linha">
              <span className="avatar" style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--rosa-claro)', color: 'var(--vinho)' }}>
                {p.modoCalculo === 'tamanho' ? <Cake size={20} /> : <Candy size={20} />}
              </span>
              <div className="cresce">
                <p className="titulo-card">{p.nome}</p>
                <p className="suave">
                  {p.tipo === 'personalizavel' ? 'Personalizável' : 'Simples'} ·{' '}
                  {p.modoCalculo === 'tamanho' ? 'por tamanho' : `${dinheiro(p.precoBase)} / un`}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <button type="button" className="fab" onClick={() => navigate('/produtos/novo')}>
        <Plus size={22} /> Novo produto
      </button>
    </>
  );
}

export function ReceitasPage() {
  const [params, setParams] = useSearchParams();
  const aba = params.get('aba') === 'produtos' ? 'produtos' : 'receitas';
  return (
    <Pagina titulo={aba === 'produtos' ? 'Produtos' : 'Receitas'}>
      <div className="segmentado" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'receitas'} className={aba === 'receitas' ? 'ativo' : ''}
          onClick={() => setParams({}, { replace: true })}>Receitas</button>
        <button type="button" role="tab" aria-selected={aba === 'produtos'} className={aba === 'produtos' ? 'ativo' : ''}
          onClick={() => setParams({ aba: 'produtos' }, { replace: true })}>Produtos</button>
      </div>
      {aba === 'receitas' ? <ListaReceitas /> : <ListaProdutos />}
    </Pagina>
  );
}
