-- =====================================================================
-- Dados de EXEMPLO — para testar o sistema durante o desenvolvimento.
-- Quantidades e fatores são ilustrativos: ajuste com as receitas reais.
-- Para subir o banco sem exemplos, apague (ou renomeie para .bak)
-- este arquivo antes da primeira subida.
-- =====================================================================
SET NAMES utf8mb4;
SET time_zone = '-03:00';

-- ---------------------------------------------------------------------
-- Ingredientes
-- ---------------------------------------------------------------------
INSERT INTO ingrediente (nome, unidade_estoque_id, estoque_minimo, embalagem_quantidade, embalagem_descricao)
SELECT x.nome, u.id, x.minimo, x.emb_qtd, x.emb_desc
  FROM (
    SELECT 'Farinha de trigo'      AS nome, 'g'  AS un, 1000 AS minimo, 1000 AS emb_qtd, 'pacote 1 kg'   AS emb_desc UNION ALL
    SELECT 'Açúcar refinado',               'g',        1000,           1000,            'pacote 1 kg'   UNION ALL
    SELECT 'Ovo',                           'un',       12,             30,              'bandeja 30 un' UNION ALL
    SELECT 'Leite integral',                'ml',       1000,           1000,            'caixa 1 L'     UNION ALL
    SELECT 'Óleo de soja',                  'ml',       500,            900,             'garrafa 900 ml' UNION ALL
    SELECT 'Manteiga',                      'g',        200,            200,             'tablete 200 g' UNION ALL
    SELECT 'Fermento químico',              'g',        50,             100,             'lata 100 g'    UNION ALL
    SELECT 'Chocolate em pó 50%',           'g',        200,            200,             'pacote 200 g'  UNION ALL
    SELECT 'Leite condensado',              'g',        790,            395,             'lata 395 g'    UNION ALL
    SELECT 'Creme de leite',                'g',        400,            200,             'caixa 200 g'   UNION ALL
    SELECT 'Suco de maracujá concentrado',  'ml',       200,            500,             'garrafa 500 ml' UNION ALL
    SELECT 'Chantilly',                     'ml',       500,            1000,            'caixa 1 L'     UNION ALL
    SELECT 'Granulado de chocolate',        'g',        200,            500,             'pacote 500 g'
  ) x
  JOIN unidade_medida u ON u.codigo = x.un;

-- Conversões específicas (xícara/colher/lata/caixa -> unidade de estoque)
INSERT INTO ingrediente_conversao (ingrediente_id, unidade_id, quantidade)
SELECT i.id, u.id, x.qtd
  FROM (
    SELECT 'Farinha de trigo'    AS ing, 'xic'  AS un, 120 AS qtd UNION ALL
    SELECT 'Farinha de trigo',           'cs',          7.5       UNION ALL
    SELECT 'Açúcar refinado',            'xic',         180       UNION ALL
    SELECT 'Açúcar refinado',            'cs',          12        UNION ALL
    SELECT 'Chocolate em pó 50%',        'xic',         90        UNION ALL
    SELECT 'Chocolate em pó 50%',        'cs',          6         UNION ALL
    SELECT 'Fermento químico',           'cs',          10        UNION ALL
    SELECT 'Manteiga',                   'cs',          14        UNION ALL
    SELECT 'Leite condensado',           'lata',        395       UNION ALL
    SELECT 'Creme de leite',             'cx',          200
  ) x
  JOIN ingrediente i    ON i.nome = x.ing
  JOIN unidade_medida u ON u.codigo = x.un;

-- ---------------------------------------------------------------------
-- Receitas
-- Massas/recheios/coberturas: rendimento = 1 un (referência 20 cm).
-- Brigadeiro: rendimento = 100 un.
-- ---------------------------------------------------------------------
INSERT INTO receita (nome, tipo_receita_id, rendimento_quantidade, rendimento_unidade_id)
SELECT x.nome, t.id, x.rend, u.id
  FROM (
    SELECT 'Massa de chocolate'    AS nome, 'Massa'      AS tipo, 1   AS rend, 'un' AS un UNION ALL
    SELECT 'Massa branca',                  'Massa',              1,           'un'       UNION ALL
    SELECT 'Recheio de maracujá',           'Recheio',            1,           'un'       UNION ALL
    SELECT 'Recheio de brigadeiro',         'Recheio',            1,           'un'       UNION ALL
    SELECT 'Cobertura de chantilly',        'Cobertura',          1,           'un'       UNION ALL
    SELECT 'Brigadeiro tradicional',        'Brigadeiro',         100,         'un'
  ) x
  JOIN tipo_receita t   ON t.nome = x.tipo
  JOIN unidade_medida u ON u.codigo = x.un;

INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade_id, ordem)
SELECT r.id, i.id, x.qtd, u.id, x.ordem
  FROM (
    -- Massa de chocolate (forma 20 cm)
    SELECT 'Massa de chocolate' AS rec, 'Farinha de trigo' AS ing, 2 AS qtd, 'xic' AS un, 1 AS ordem UNION ALL
    SELECT 'Massa de chocolate', 'Açúcar refinado',        1.5, 'xic', 2 UNION ALL
    SELECT 'Massa de chocolate', 'Chocolate em pó 50%',    1,   'xic', 3 UNION ALL
    SELECT 'Massa de chocolate', 'Ovo',                    4,   'un',  4 UNION ALL
    SELECT 'Massa de chocolate', 'Leite integral',         1,   'xic', 5 UNION ALL
    SELECT 'Massa de chocolate', 'Óleo de soja',           0.5, 'xic', 6 UNION ALL
    SELECT 'Massa de chocolate', 'Fermento químico',       1,   'cs',  7 UNION ALL
    -- Massa branca (forma 20 cm)
    SELECT 'Massa branca', 'Farinha de trigo',   2,   'xic', 1 UNION ALL
    SELECT 'Massa branca', 'Açúcar refinado',    1.5, 'xic', 2 UNION ALL
    SELECT 'Massa branca', 'Ovo',                4,   'un',  3 UNION ALL
    SELECT 'Massa branca', 'Leite integral',     1,   'xic', 4 UNION ALL
    SELECT 'Massa branca', 'Manteiga',           100, 'g',   5 UNION ALL
    SELECT 'Massa branca', 'Fermento químico',   1,   'cs',  6 UNION ALL
    -- Recheio de maracujá (bolo 20 cm)
    SELECT 'Recheio de maracujá', 'Leite condensado',             2,   'lata', 1 UNION ALL
    SELECT 'Recheio de maracujá', 'Creme de leite',               1,   'cx',   2 UNION ALL
    SELECT 'Recheio de maracujá', 'Suco de maracujá concentrado', 150, 'ml',   3 UNION ALL
    -- Recheio de brigadeiro (bolo 20 cm)
    SELECT 'Recheio de brigadeiro', 'Leite condensado',    2,  'lata', 1 UNION ALL
    SELECT 'Recheio de brigadeiro', 'Chocolate em pó 50%', 3,  'cs',   2 UNION ALL
    SELECT 'Recheio de brigadeiro', 'Manteiga',            20, 'g',    3 UNION ALL
    SELECT 'Recheio de brigadeiro', 'Creme de leite',      1,  'cx',   4 UNION ALL
    -- Cobertura de chantilly (bolo 20 cm)
    SELECT 'Cobertura de chantilly', 'Chantilly', 0.5, 'l', 1 UNION ALL
    -- Brigadeiro tradicional (rende 100 un)
    SELECT 'Brigadeiro tradicional', 'Leite condensado',       4,   'lata', 1 UNION ALL
    SELECT 'Brigadeiro tradicional', 'Chocolate em pó 50%',    100, 'g',    2 UNION ALL
    SELECT 'Brigadeiro tradicional', 'Manteiga',               60,  'g',    3 UNION ALL
    SELECT 'Brigadeiro tradicional', 'Granulado de chocolate', 400, 'g',    4
  ) x
  JOIN receita r        ON r.nome = x.rec
  JOIN ingrediente i    ON i.nome = x.ing
  JOIN unidade_medida u ON u.codigo = x.un;

-- Fatores de escala por tamanho (não lineares; 20 cm = referência)
INSERT INTO receita_fator_tamanho (receita_id, tamanho_id, fator)
SELECT r.id, t.id, x.fator
  FROM (
    SELECT 'Massa de chocolate' AS rec, '15 cm' AS tam, 0.6 AS fator UNION ALL
    SELECT 'Massa de chocolate', '20 cm', 1.0  UNION ALL
    SELECT 'Massa de chocolate', '25 cm', 1.6  UNION ALL
    SELECT 'Massa de chocolate', '30 cm', 2.3  UNION ALL
    SELECT 'Massa branca',       '15 cm', 0.6  UNION ALL
    SELECT 'Massa branca',       '20 cm', 1.0  UNION ALL
    SELECT 'Massa branca',       '25 cm', 1.6  UNION ALL
    SELECT 'Massa branca',       '30 cm', 2.3  UNION ALL
    SELECT 'Recheio de maracujá',   '15 cm', 0.6 UNION ALL
    SELECT 'Recheio de maracujá',   '20 cm', 1.0 UNION ALL
    SELECT 'Recheio de maracujá',   '25 cm', 1.5 UNION ALL
    SELECT 'Recheio de maracujá',   '30 cm', 2.1 UNION ALL
    SELECT 'Recheio de brigadeiro', '15 cm', 0.6 UNION ALL
    SELECT 'Recheio de brigadeiro', '20 cm', 1.0 UNION ALL
    SELECT 'Recheio de brigadeiro', '25 cm', 1.5 UNION ALL
    SELECT 'Recheio de brigadeiro', '30 cm', 2.1 UNION ALL
    SELECT 'Cobertura de chantilly', '15 cm', 0.7 UNION ALL
    SELECT 'Cobertura de chantilly', '20 cm', 1.0 UNION ALL
    SELECT 'Cobertura de chantilly', '25 cm', 1.4 UNION ALL
    SELECT 'Cobertura de chantilly', '30 cm', 1.9
  ) x
  JOIN receita r ON r.nome = x.rec
  JOIN tamanho t ON t.nome = x.tam;

-- ---------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------
INSERT INTO produto (nome, descricao, tipo, modo_calculo, preco_base) VALUES
    ('Bolo personalizado',     'Escolha massa, recheio, cobertura e tamanho', 'personalizavel', 'tamanho',    NULL),
    ('Brigadeiro tradicional', 'Brigadeiro de chocolate com granulado',       'simples',        'rendimento', 2.50),
    ('Caixa com 25 brigadeiros','Caixa presenteável',                          'simples',        'rendimento', 60.00);

INSERT INTO produto_tamanho (produto_id, tamanho_id, preco)
SELECT p.id, t.id, x.preco
  FROM (
    SELECT '15 cm' AS tam, 120.00 AS preco UNION ALL
    SELECT '20 cm', 180.00 UNION ALL
    SELECT '25 cm', 260.00 UNION ALL
    SELECT '30 cm', 360.00
  ) x
  JOIN produto p ON p.nome = 'Bolo personalizado'
  JOIN tamanho t ON t.nome = x.tam;

INSERT INTO produto_componente (produto_id, nome, quantidade_por_unidade, ordem)
SELECT p.id, x.comp, x.qpu, x.ordem
  FROM (
    SELECT 'Bolo personalizado' AS prod, 'Massa' AS comp, 1 AS qpu, 1 AS ordem UNION ALL
    SELECT 'Bolo personalizado', 'Recheio',    1,  2 UNION ALL
    SELECT 'Bolo personalizado', 'Cobertura',  1,  3 UNION ALL
    SELECT 'Brigadeiro tradicional', 'Brigadeiro', 1,  1 UNION ALL
    SELECT 'Caixa com 25 brigadeiros', 'Brigadeiro', 25, 1
  ) x
  JOIN produto p ON p.nome = x.prod;

INSERT INTO produto_componente_opcao (componente_id, receita_id, padrao)
SELECT c.id, r.id, x.padrao
  FROM (
    SELECT 'Bolo personalizado' AS prod, 'Massa' AS comp, 'Massa de chocolate' AS rec, TRUE AS padrao UNION ALL
    SELECT 'Bolo personalizado', 'Massa',      'Massa branca',           FALSE UNION ALL
    SELECT 'Bolo personalizado', 'Recheio',    'Recheio de brigadeiro',  TRUE  UNION ALL
    SELECT 'Bolo personalizado', 'Recheio',    'Recheio de maracujá',    FALSE UNION ALL
    SELECT 'Bolo personalizado', 'Cobertura',  'Cobertura de chantilly', TRUE  UNION ALL
    SELECT 'Brigadeiro tradicional',   'Brigadeiro', 'Brigadeiro tradicional', TRUE UNION ALL
    SELECT 'Caixa com 25 brigadeiros', 'Brigadeiro', 'Brigadeiro tradicional', TRUE
  ) x
  JOIN produto p            ON p.nome = x.prod
  JOIN produto_componente c ON c.produto_id = p.id AND c.nome = x.comp
  JOIN receita r            ON r.nome = x.rec;

-- ---------------------------------------------------------------------
-- Estoque inicial (via movimentação — o trigger atualiza estoque_atual)
-- Obs.: o MySQL não permite um INSERT ... SELECT que leia `ingrediente`
-- enquanto o trigger atualiza `ingrediente`; por isso os ids são
-- resolvidos antes numa tabela temporária.
-- ---------------------------------------------------------------------
CREATE TEMPORARY TABLE tmp_estoque_inicial AS
SELECT i.id AS ingrediente_id, x.qtd
  FROM (
    SELECT 'Farinha de trigo' AS ing, 2000 AS qtd UNION ALL
    SELECT 'Açúcar refinado',              1000 UNION ALL
    SELECT 'Ovo',                          20   UNION ALL
    SELECT 'Leite integral',               1000 UNION ALL
    SELECT 'Óleo de soja',                 900  UNION ALL
    SELECT 'Manteiga',                     400  UNION ALL
    SELECT 'Fermento químico',             100  UNION ALL
    SELECT 'Chocolate em pó 50%',          400  UNION ALL
    SELECT 'Leite condensado',             2370 UNION ALL   -- 6 latas
    SELECT 'Creme de leite',               400  UNION ALL
    SELECT 'Suco de maracujá concentrado', 500  UNION ALL
    SELECT 'Chantilly',                    1000 UNION ALL
    SELECT 'Granulado de chocolate',       500
  ) x
  JOIN ingrediente i ON i.nome = x.ing;

INSERT INTO movimentacao_estoque (ingrediente_id, tipo, quantidade, observacao)
SELECT ingrediente_id, 'entrada', qtd, 'Estoque inicial (exemplo)'
  FROM tmp_estoque_inicial;

DROP TEMPORARY TABLE tmp_estoque_inicial;

-- ---------------------------------------------------------------------
-- Cliente e encomenda de exemplo (em orçamento — ainda sem snapshot;
-- o backend calcula e grava o snapshot ao confirmar)
-- ---------------------------------------------------------------------
INSERT INTO cliente (nome, telefone, observacoes)
VALUES ('Maria Exemplo', '(11) 90000-0000', 'Cliente fictícia para testes');

INSERT INTO encomenda (cliente_id, data_entrega, observacoes)
SELECT id, TIMESTAMP(CURRENT_DATE + INTERVAL 7 DAY, '15:00:00'), 'Festa de aniversário'
  FROM cliente WHERE nome = 'Maria Exemplo';

SET @enc := LAST_INSERT_ID();

-- Item 1: bolo 30 cm — massa chocolate, recheio maracujá, cobertura chantilly
INSERT INTO encomenda_item (encomenda_id, produto_id, tamanho_id, quantidade, preco_unitario, observacoes)
SELECT @enc, p.id, t.id, 1, 360.00, 'Escrever "Parabéns, Ana!"'
  FROM produto p, tamanho t
 WHERE p.nome = 'Bolo personalizado' AND t.nome = '30 cm';

SET @item := LAST_INSERT_ID();

INSERT INTO encomenda_item_componente (item_id, componente_id, receita_id)
SELECT @item, c.id, r.id
  FROM (
    SELECT 'Massa' AS comp, 'Massa de chocolate' AS rec UNION ALL
    SELECT 'Recheio',       'Recheio de maracujá'       UNION ALL
    SELECT 'Cobertura',     'Cobertura de chantilly'
  ) x
  JOIN produto p            ON p.nome = 'Bolo personalizado'
  JOIN produto_componente c ON c.produto_id = p.id AND c.nome = x.comp
  JOIN receita r            ON r.nome = x.rec;

-- Item 2: 300 brigadeiros
INSERT INTO encomenda_item (encomenda_id, produto_id, quantidade, preco_unitario)
SELECT @enc, id, 300, 2.50 FROM produto WHERE nome = 'Brigadeiro tradicional';

SET @item := LAST_INSERT_ID();

INSERT INTO encomenda_item_componente (item_id, componente_id, receita_id)
SELECT @item, c.id, o.receita_id
  FROM produto p
  JOIN produto_componente c       ON c.produto_id = p.id
  JOIN produto_componente_opcao o ON o.componente_id = c.id AND o.padrao
 WHERE p.nome = 'Brigadeiro tradicional';

UPDATE encomenda e
   SET valor_total = (SELECT SUM(quantidade * preco_unitario) FROM encomenda_item WHERE encomenda_id = e.id)
 WHERE e.id = @enc;
