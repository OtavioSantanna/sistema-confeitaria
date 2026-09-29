-- =====================================================================
-- Script de VALIDAÇÃO do modelo (não roda na inicialização).
-- Simula, em SQL, o que o backend fará: calcular ingredientes da
-- encomenda de exemplo, confirmar (snapshot + reserva) e iniciar a
-- produção (baixa de estoque). Tudo dentro de uma transação que é
-- desfeita no final — o banco não é alterado.
--
-- Uso:
--   docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < database/testes/validar-modelo.sql
--
-- A consulta do passo 1 serve de REFERÊNCIA para a lógica do backend.
-- =====================================================================
SET NAMES utf8mb4;
START TRANSACTION;

SET @enc := (SELECT MIN(id) FROM encomenda);

-- ---------------------------------------------------------------------
-- 1. Cálculo (lógica de referência)
--    fator:
--      modo 'tamanho'    = fator(receita, tamanho) x quantidade
--      modo 'rendimento' = quantidade x qtd_por_unidade / rendimento
--    conversão para unidade de estoque:
--      1º conversão específica do ingrediente (ingrediente_conversao)
--      2º mesma grandeza: fator_base(origem) / fator_base(estoque)
--      senão -> NULL = unidades incompatíveis (backend deve dar erro)
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_calculo;
CREATE TEMPORARY TABLE tmp_calculo AS
SELECT ei.encomenda_id,
       ei.id                          AS item_id,
       pc.id                          AS componente_id,
       r.id                           AS receita_id,
       r.nome                         AS receita_nome,
       CASE p.modo_calculo
         WHEN 'tamanho'    THEN rft.fator * ei.quantidade
         WHEN 'rendimento' THEN ei.quantidade * pc.quantidade_por_unidade / r.rendimento_quantidade
       END                            AS fator_escala,
       i.id                           AS ingrediente_id,
       i.unidade_estoque_id           AS unidade_id,
       ri.quantidade
         * COALESCE(conv.quantidade,
                    CASE WHEN ur.grandeza = ue.grandeza
                         THEN ur.fator_base / ue.fator_base END)
                                      AS qtd_base_estoque
  FROM encomenda_item ei
  JOIN produto p                     ON p.id  = ei.produto_id
  JOIN encomenda_item_componente eic ON eic.item_id = ei.id
  JOIN produto_componente pc         ON pc.id = eic.componente_id
  JOIN receita r                     ON r.id  = eic.receita_id
  LEFT JOIN receita_fator_tamanho rft ON rft.receita_id = r.id AND rft.tamanho_id = ei.tamanho_id
  JOIN receita_ingrediente ri        ON ri.receita_id = r.id
  JOIN ingrediente i                 ON i.id  = ri.ingrediente_id
  JOIN unidade_medida ur             ON ur.id = ri.unidade_id
  JOIN unidade_medida ue             ON ue.id = i.unidade_estoque_id
  LEFT JOIN ingrediente_conversao conv
         ON conv.ingrediente_id = i.id AND conv.unidade_id = ri.unidade_id
 WHERE ei.encomenda_id = @enc;

SELECT 'Linhas sem conversão ou sem fator (devem ser 0)' AS verificacao,
       COUNT(*) AS qtd
  FROM tmp_calculo WHERE qtd_base_estoque IS NULL OR fator_escala IS NULL;

SELECT '1. Necessidade por receita' AS etapa;
SELECT receita_nome, ROUND(fator_escala, 4) AS fator,
       i.nome AS ingrediente,
       ROUND(qtd_base_estoque * fator_escala, 2) AS quantidade, u.codigo AS un
  FROM tmp_calculo c
  JOIN ingrediente i    ON i.id = c.ingrediente_id
  JOIN unidade_medida u ON u.id = c.unidade_id
 ORDER BY c.item_id, c.componente_id, i.nome;

-- ---------------------------------------------------------------------
-- 2. Confirmar: gravar snapshot e mudar status
-- ---------------------------------------------------------------------
INSERT INTO encomenda_necessidade
      (encomenda_id, item_id, componente_id, receita_id, receita_nome,
       fator_escala, ingrediente_id, quantidade, unidade_id)
SELECT encomenda_id, item_id, componente_id, receita_id, receita_nome,
       fator_escala, ingrediente_id, qtd_base_estoque * fator_escala, unidade_id
  FROM tmp_calculo;

UPDATE encomenda SET status = 'confirmada', confirmada_em = NOW() WHERE id = @enc;

SELECT '2. Consolidado da encomenda (ingredientes agrupados)' AS etapa;
SELECT ingrediente, ROUND(quantidade, 2) AS quantidade, unidade
  FROM vw_encomenda_necessidade WHERE encomenda_id = @enc ORDER BY ingrediente;

SELECT '2. Estoque com reserva' AS etapa;
SELECT ingrediente, unidade, estoque_fisico, ROUND(estoque_reservado, 2) AS reservado,
       ROUND(estoque_disponivel, 2) AS disponivel, abaixo_minimo
  FROM vw_estoque ORDER BY ingrediente;

-- Lista de compras (exemplo de regra; a versão final fica no backend):
-- comprar = necessidade - disponível_para_essas_encomendas,
-- arredondado para cima em embalagens inteiras.
SELECT '2. Lista de compras (encomendas confirmadas)' AS etapa;
SELECT e.ingrediente, e.unidade,
       ROUND(n.necessario, 2)                         AS necessario,
       e.estoque_fisico                               AS fisico,
       ROUND(e.estoque_reservado, 2)                  AS reservado,
       ROUND(GREATEST(n.necessario - e.estoque_fisico, 0), 2) AS falta,
       e.embalagem_descricao,
       CEIL(GREATEST(n.necessario - e.estoque_fisico, 0) / e.embalagem_quantidade) AS embalagens
  FROM (SELECT ingrediente_id, SUM(quantidade) AS necessario
          FROM vw_encomenda_necessidade
         WHERE status = 'confirmada'
         GROUP BY ingrediente_id) n
  JOIN vw_estoque e ON e.ingrediente_id = n.ingrediente_id
 ORDER BY (n.necessario > e.estoque_fisico) DESC, e.ingrediente;

-- ---------------------------------------------------------------------
-- 3. Mudança de receita NÃO altera o snapshot
-- ---------------------------------------------------------------------
UPDATE receita_ingrediente ri
  JOIN receita r ON r.id = ri.receita_id
  JOIN ingrediente i ON i.id = ri.ingrediente_id
   SET ri.quantidade = 10
 WHERE r.nome = 'Brigadeiro tradicional' AND i.nome = 'Leite condensado';

SELECT '3. Snapshot preservado após alterar receita (leite condensado deve seguir 6399 g)' AS etapa;
SELECT ingrediente, ROUND(quantidade, 2) AS quantidade
  FROM vw_encomenda_necessidade
 WHERE encomenda_id = @enc AND ingrediente = 'Leite condensado';

-- ---------------------------------------------------------------------
-- 4. Iniciar produção: baixa de estoque e fim da reserva
-- ---------------------------------------------------------------------
INSERT INTO movimentacao_estoque (ingrediente_id, tipo, quantidade, encomenda_id, observacao)
SELECT ingrediente_id, 'producao', -SUM(quantidade), @enc, CONCAT('Produção encomenda #', @enc)
  FROM encomenda_necessidade WHERE encomenda_id = @enc
 GROUP BY ingrediente_id;

UPDATE encomenda SET status = 'em_producao', estoque_baixado_em = NOW() WHERE id = @enc;

SELECT '4. Estoque após baixa (reservado deve ser 0; negativos = faltou comprar)' AS etapa;
SELECT ingrediente, ROUND(estoque_fisico, 2) AS fisico,
       ROUND(estoque_reservado, 2) AS reservado
  FROM vw_estoque ORDER BY ingrediente;

SELECT '4. Histórico de status' AS etapa;
SELECT status_anterior, status_novo FROM encomenda_status_historico
 WHERE encomenda_id = @enc ORDER BY id;

ROLLBACK;
