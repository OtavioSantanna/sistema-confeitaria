// Teste de ponta a ponta da API (precisa da API rodando + banco).
//   docker compose exec api npm test
//   ou:  API_URL=http://localhost:3001/api/v1 npm test
// Cria seus próprios dados (com sufixo único), sem depender dos exemplos.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const S = ` T${Date.now().toString(36)}`; // sufixo para nomes únicos

async function req(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}
const get = (p) => req('GET', p);
const post = (p, b) => req('POST', p, b);
const put = (p, b) => req('PUT', p, b);
const patch = (p, b) => req('PATCH', p, b);

const ids = {};
const un = async (codigo) => (await get('/unidades')).data.find((u) => u.codigo === codigo).id;
const qtd = (lista, id) => lista.find((i) => i.ingredienteId === id)?.quantidade;

test('fluxo completo: cadastros -> encomenda -> lista de compras -> produção', async (t) => {
  const g = await un('g'); const kg = await un('kg'); const xic = await un('xic'); const u = await un('un');
  const lata = await un('lata');

  await t.test('ingredientes', async () => {
    let r = await post('/ingredientes', {
      nome: `Farinha${S}`, unidadeEstoqueId: g, estoqueMinimo: 500,
      embalagemQuantidade: 1000, embalagemDescricao: 'pacote 1 kg',
      conversoes: [{ unidadeId: xic, quantidade: 120 }], estoqueInicial: 1000,
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.estoqueFisico, '1000.0000');
    ids.farinha = r.data.id;

    r = await post('/ingredientes', {
      nome: `Leite cond${S}`, unidadeEstoqueId: g, embalagemQuantidade: 395, embalagemDescricao: 'lata',
      conversoes: [{ unidadeId: lata, quantidade: 395 }],
    });
    ids.leite = r.data.id;
    r = await post('/ingredientes', { nome: `Ovo${S}`, unidadeEstoqueId: u, estoqueInicial: 6 });
    ids.ovo = r.data.id;

    r = await post('/ingredientes', { nome: '', unidadeEstoqueId: g });
    assert.equal(r.status, 400);
    assert.equal(r.data.detalhes[0].campo, 'nome');
  });

  await t.test('tamanhos', async () => {
    let r = await post('/tamanhos', { nome: `P${S}`, ordem: 90 });
    ids.tP = r.data.id;
    r = await post('/tamanhos', { nome: `G${S}`, ordem: 91 });
    ids.tG = r.data.id;
    ids.tipo = (await get('/tipos-receita')).data[0].id;
  });

  await t.test('receitas: validação de conversão', async () => {
    const r = await post('/receitas', {
      nome: `Inválida${S}`, tipoReceitaId: ids.tipo, rendimentoUnidadeId: u,
      ingredientes: [{ ingredienteId: ids.ovo, quantidade: 1, unidadeId: xic }], // ovo em xícara
    });
    assert.equal(r.status, 400);
    assert.match(r.data.detalhes[0], /não converte/);
  });

  await t.test('receitas', async () => {
    let r = await post('/receitas', {
      nome: `Massa${S}`, tipoReceitaId: ids.tipo, rendimentoUnidadeId: u,
      ingredientes: [
        { ingredienteId: ids.farinha, quantidade: 2, unidadeId: xic }, // 240 g
        { ingredienteId: ids.ovo, quantidade: 3, unidadeId: u },
      ],
      fatores: [{ tamanhoId: ids.tP, fator: 1 }], // falta o tamanho G (de propósito)
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.ingredientes[0].quantidadeEstoque, '240');
    ids.massa = r.data.id;

    r = await post('/receitas', {
      nome: `Brigadeiro${S}`, tipoReceitaId: ids.tipo, rendimentoQuantidade: 50, rendimentoUnidadeId: u,
      ingredientes: [{ ingredienteId: ids.leite, quantidade: 2, unidadeId: lata }], // 790 g / 50 un
    });
    ids.brig = r.data.id;

    r = await get(`/receitas/${ids.brig}/calculo?quantidade=125`);
    assert.equal(r.data.fatorEscala, '2.5');
    assert.equal(qtd(r.data.ingredientes, ids.leite), '1975');
  });

  await t.test('produtos: exige fator para todos os tamanhos', async () => {
    const body = {
      nome: `Bolo${S}`, tipo: 'personalizavel', modoCalculo: 'tamanho',
      tamanhos: [{ tamanhoId: ids.tP, preco: 100 }, { tamanhoId: ids.tG, preco: 200 }],
      componentes: [{ nome: 'Massa', opcoes: [{ receitaId: ids.massa, padrao: true, precoAdicional: 5 }] }],
    };
    let r = await post('/produtos', body);
    assert.equal(r.status, 400);
    assert.match(r.data.detalhes.join(), new RegExp(`G${S}`));

    // Cadastra o fator não linear do tamanho G e tenta de novo
    const rec = (await get(`/receitas/${ids.massa}`)).data;
    r = await put(`/receitas/${ids.massa}`, {
      nome: rec.nome, tipoReceitaId: rec.tipoReceitaId, rendimentoUnidadeId: rec.rendimentoUnidadeId,
      ingredientes: rec.ingredientes.map((i) => ({ ingredienteId: i.ingredienteId, quantidade: i.quantidade, unidadeId: i.unidadeId })),
      fatores: [{ tamanhoId: ids.tP, fator: 1 }, { tamanhoId: ids.tG, fator: 2.25 }],
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));

    r = await post('/produtos', body);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    ids.bolo = r.data.id;
    ids.compMassa = r.data.componentes[0].id;

    r = await post('/produtos', {
      nome: `Brigadeiro${S}`, tipo: 'simples', modoCalculo: 'rendimento', precoBase: 2.5,
      componentes: [{ nome: 'Brigadeiro', opcoes: [{ receitaId: ids.brig }] }],
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    ids.prodBrig = r.data.id;
  });

  await t.test('encomendas: validação e preço', async () => {
    ids.cliente = (await post('/clientes', { nome: `Cliente${S}`, telefone: '11 99999-0000' })).data.id;

    let r = await post('/encomendas', {
      clienteId: ids.cliente, dataEntrega: '2099-01-10 15:00',
      itens: [{ produtoId: ids.bolo, quantidade: 1 }], // sem tamanho
    });
    assert.equal(r.status, 400);

    r = await post('/encomendas', {
      clienteId: ids.cliente, dataEntrega: '2099-01-10T15:00',
      itens: [
        { produtoId: ids.bolo, tamanhoId: ids.tG, quantidade: 1 },
        { produtoId: ids.prodBrig, quantidade: 100 },
      ],
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    ids.enc1 = r.data.id;
    assert.equal(r.data.status, 'orcamento');
    assert.equal(r.data.itens[0].precoUnitario, '205.00'); // 200 + adicional 5
    assert.equal(r.data.valorTotal, '455.00');              // 205 + 100 x 2,50
    assert.equal(r.data.itens[0].componentes[0].componenteId, ids.compMassa);
  });

  await t.test('cálculo de ingredientes (orçamento)', async () => {
    const r = await get(`/encomendas/${ids.enc1}/ingredientes`);
    assert.equal(r.data.origem, 'calculo_atual');
    assert.equal(qtd(r.data.consolidado, ids.farinha), '540');  // 240 x 2,25
    assert.equal(qtd(r.data.consolidado, ids.ovo), '6.75');     // 3 x 2,25
    assert.equal(qtd(r.data.consolidado, ids.leite), '1580');   // 790 x 100/50
  });

  await t.test('lista de compras só com orçamentos quando pedido', async () => {
    let r = await get(`/lista-compras?encomendaIds=${ids.enc1}`);
    assert.equal(r.data.encomendas.length, 0); // orçamento não entra por padrão

    r = await get(`/lista-compras?encomendaIds=${ids.enc1}&incluirOrcamentos=true`);
    const leite = r.data.itens.find((i) => i.ingredienteId === ids.leite);
    assert.equal(leite.comprar, '1580');
    assert.equal(leite.embalagem.embalagens, 4);     // 1580 / 395 = 4 latas
    const farinha = r.data.itens.find((i) => i.ingredienteId === ids.farinha);
    assert.equal(farinha.precisaComprar, false);     // tem 1000, precisa 540

    r = await get(`/lista-compras?encomendaIds=${ids.enc1}&incluirOrcamentos=true&considerarEstoqueMinimo=true`);
    const f2 = r.data.itens.find((i) => i.ingredienteId === ids.farinha);
    assert.equal(f2.comprar, '40');                  // 540 + mínimo 500 - 1000
    assert.equal(f2.quantidadeCompra, '1000');       // 1 pacote
  });

  await t.test('confirmar grava snapshot e reserva', async () => {
    let r = await patch(`/encomendas/${ids.enc1}/status`, { status: 'confirmada', observacao: 'Sinal pago' });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.historico.at(-1).observacao, 'Sinal pago');

    r = await get(`/estoque?ingredienteIds=${ids.farinha}`);
    assert.equal(r.data[0].estoqueReservado, '540.0000');
    assert.equal(r.data[0].estoqueDisponivel, '460.0000');

    // Editar a receita NÃO altera a encomenda confirmada
    const rec = (await get(`/receitas/${ids.massa}`)).data;
    await put(`/receitas/${ids.massa}`, {
      nome: rec.nome, tipoReceitaId: rec.tipoReceitaId, rendimentoUnidadeId: rec.rendimentoUnidadeId,
      ingredientes: [{ ingredienteId: ids.farinha, quantidade: 10, unidadeId: xic }],
      fatores: rec.fatores.map((f) => ({ tamanhoId: f.tamanhoId, fator: f.fator })),
    });
    r = await get(`/encomendas/${ids.enc1}/ingredientes`);
    assert.equal(r.data.origem, 'snapshot');
    assert.equal(qtd(r.data.consolidado, ids.farinha), '540');

    // Confirmada não pode ser editada
    r = await put(`/encomendas/${ids.enc1}`, {
      clienteId: ids.cliente, dataEntrega: '2099-01-10', itens: [{ produtoId: ids.prodBrig, quantidade: 1 }],
    });
    assert.equal(r.status, 409);
  });

  await t.test('lista de compras respeita reservas de outras encomendas', async () => {
    // Nova encomenda: 50 brigadeiros (790 g de leite), confirmada
    let r = await post('/encomendas', {
      clienteId: ids.cliente, dataEntrega: '2099-01-11',
      itens: [{ produtoId: ids.prodBrig, quantidade: 50 }],
    });
    ids.enc2 = r.data.id;
    await patch(`/encomendas/${ids.enc2}/status`, { status: 'confirmada' });

    // Ovos: 6 em estoque, enc1 reservou 6,75. Enc2 não usa ovo.
    // Farinha: só enc2 selecionada; enc1 reservou 540 de 1000 -> 460 livres
    r = await get(`/lista-compras?encomendaIds=${ids.enc2}`);
    const leite = r.data.itens.find((i) => i.ingredienteId === ids.leite);
    assert.equal(leite.necessario, '790');
    assert.equal(leite.reservadoOutrasEncomendas, '1580');
    assert.equal(leite.comprar, '790');

    // Período cobrindo as duas
    r = await get('/lista-compras?de=2099-01-10&ate=2099-01-11');
    const ids2 = r.data.encomendas.map((e) => e.id);
    assert.ok(ids2.includes(ids.enc1) && ids2.includes(ids.enc2));
    const ovo = r.data.itens.find((i) => i.ingredienteId === ids.ovo);
    assert.equal(ovo.comprar, '0.75');
    assert.equal(ovo.quantidadeCompra, '1');      // arredonda para cima (0 casas em "un")
  });

  await t.test('entrada de estoque com conversão de unidade', async () => {
    const r = await post('/estoque/movimentacoes', {
      ingredienteId: ids.leite, tipo: 'entrada', quantidade: 2, unidadeId: kg, custoTotal: 50,
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.estoqueFisico, '2000.0000');
  });

  await t.test('produção dá baixa e libera reserva', async () => {
    let r = await patch(`/encomendas/${ids.enc1}/status`, { status: 'pronta' });
    assert.equal(r.status, 409); // confirmada -> pronta não é permitido

    r = await patch(`/encomendas/${ids.enc1}/status`, { status: 'em_producao' });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.ok(r.data.avisos.some((a) => a.includes(`Ovo${S}`))); // ovo ficou negativo

    r = await get(`/estoque?ingredienteIds=${ids.farinha},${ids.leite}`);
    const farinha = r.data.find((i) => i.ingredienteId === ids.farinha);
    const leite = r.data.find((i) => i.ingredienteId === ids.leite);
    assert.equal(farinha.estoqueFisico, '460.0000');
    assert.equal(farinha.estoqueReservado, '0.0000');
    assert.equal(leite.estoqueFisico, '420.0000');     // 2000 - 1580
    assert.equal(leite.estoqueReservado, '790.0000');  // ainda reservado pela enc2

    r = await patch(`/encomendas/${ids.enc1}/status`, { status: 'orcamento' });
    assert.equal(r.status, 409);

    r = await get(`/estoque/movimentacoes?encomendaId=${ids.enc1}`);
    assert.equal(r.data.length, 3);
    assert.ok(r.data.every((m) => m.tipo === 'producao'));
  });

  await t.test('cancelar libera a reserva; exclusão só de orçamento/cancelada', async () => {
    let r = await patch(`/encomendas/${ids.enc2}/status`, { status: 'cancelada' });
    assert.equal(r.status, 200);
    r = await get(`/estoque?ingredienteIds=${ids.leite}`);
    assert.equal(r.data[0].estoqueReservado, '0.0000');

    r = await req('DELETE', `/encomendas/${ids.enc1}`);
    assert.equal(r.status, 409);
    r = await req('DELETE', `/encomendas/${ids.enc2}`);
    assert.equal(r.status, 204);
  });
});
