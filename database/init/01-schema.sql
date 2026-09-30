-- =====================================================================
-- Sistema de Gestão de Confeitaria — Schema do banco (MySQL 8)
-- ---------------------------------------------------------------------
-- Executado automaticamente pelo container MySQL na PRIMEIRA subida
-- (quando o volume de dados ainda está vazio).
--
-- Convenções
--   * Tabelas e colunas em português, snake_case, singular.
--   * Quantidades: DECIMAL(14,4)  -> precisão exata, sem erro de float.
--   * Fatores de escala: DECIMAL(12,6).
--   * Valores em dinheiro: DECIMAL(12,2).
--   * Todas as datas/horas no fuso America/Sao_Paulo (-03:00).
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '-03:00';

-- =====================================================================
-- 1. UNIDADES DE MEDIDA
-- ---------------------------------------------------------------------
-- Cada unidade pertence a uma grandeza (massa, volume, contagem) e tem
-- um fator para a unidade-base da grandeza (g, ml, un).
--   ex.: kg -> fator_base 1000 (1 kg = 1000 g)
-- Unidades da mesma grandeza são convertidas automaticamente.
-- Conversões entre grandezas diferentes (ex.: xícara de farinha -> g)
-- dependem do ingrediente e ficam em `ingrediente_conversao`.
-- =====================================================================
CREATE TABLE unidade_medida (
    id              SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo          VARCHAR(20)  NOT NULL,          -- 'g', 'kg', 'ml', 'xic', ...
    nome            VARCHAR(50)  NOT NULL,          -- 'grama', 'quilograma', ...
    grandeza        ENUM('massa','volume','contagem') NOT NULL,
    fator_base      DECIMAL(18,6) NOT NULL,         -- quanto vale na unidade-base da grandeza
    casas_decimais  TINYINT UNSIGNED NOT NULL DEFAULT 2,  -- sugestão de exibição/arredondamento
    CONSTRAINT uk_unidade_codigo UNIQUE (codigo),
    CONSTRAINT ck_unidade_fator CHECK (fator_base > 0)
) ENGINE=InnoDB;

-- =====================================================================
-- 2. INGREDIENTES
-- ---------------------------------------------------------------------
-- `unidade_estoque_id` é a unidade padrão de controle do estoque.
-- `estoque_atual` é mantido AUTOMATICAMENTE por trigger a partir de
-- `movimentacao_estoque` — a aplicação nunca deve alterá-lo direto.
-- `embalagem_quantidade` (na unidade de estoque) permite arredondar a
-- lista de compras para embalagens inteiras (ex.: lata de 395 g).
-- =====================================================================
CREATE TABLE ingrediente (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome                  VARCHAR(120) NOT NULL,
    unidade_estoque_id    SMALLINT UNSIGNED NOT NULL,
    estoque_atual         DECIMAL(14,4) NOT NULL DEFAULT 0,
    estoque_minimo        DECIMAL(14,4) NOT NULL DEFAULT 0,
    embalagem_quantidade  DECIMAL(14,4) NULL,        -- ex.: 395 (g) para leite condensado
    embalagem_descricao   VARCHAR(60)  NULL,         -- ex.: 'lata 395 g'
    ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes           VARCHAR(500) NULL,
    criado_em             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_ingrediente_nome UNIQUE (nome),
    CONSTRAINT fk_ingrediente_unidade FOREIGN KEY (unidade_estoque_id)
        REFERENCES unidade_medida (id),
    CONSTRAINT ck_ingrediente_minimo   CHECK (estoque_minimo >= 0),
    CONSTRAINT ck_ingrediente_embalagem CHECK (embalagem_quantidade IS NULL OR embalagem_quantidade > 0)
) ENGINE=InnoDB;

-- Conversões específicas de um ingrediente.
-- "1 <unidade_id> deste ingrediente = <quantidade> na unidade de estoque"
--   ex.: farinha (estoque em g): 1 xícara = 120 g
--        ovo     (estoque em un): 1 g ... não se aplica; ovo usa 'un'
--        leite condensado (estoque em g): 1 lata = 395 g
CREATE TABLE ingrediente_conversao (
    ingrediente_id  INT UNSIGNED NOT NULL,
    unidade_id      SMALLINT UNSIGNED NOT NULL,
    quantidade      DECIMAL(14,4) NOT NULL,
    PRIMARY KEY (ingrediente_id, unidade_id),
    CONSTRAINT fk_conv_ingrediente FOREIGN KEY (ingrediente_id)
        REFERENCES ingrediente (id) ON DELETE CASCADE,
    CONSTRAINT fk_conv_unidade FOREIGN KEY (unidade_id)
        REFERENCES unidade_medida (id),
    CONSTRAINT ck_conv_quantidade CHECK (quantidade > 0)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. RECEITAS
-- =====================================================================
-- Tipos: massa, recheio, cobertura, brigadeiro, torta, ... (editável)
CREATE TABLE tipo_receita (
    id     SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome   VARCHAR(50) NOT NULL,
    CONSTRAINT uk_tipo_receita_nome UNIQUE (nome)
) ENGINE=InnoDB;

-- Tamanhos de bolo/torta: 15 cm, 20 cm, 25 cm, 30 cm, ...
CREATE TABLE tamanho (
    id         SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome       VARCHAR(50) NOT NULL,         -- '20 cm'
    descricao  VARCHAR(200) NULL,            -- 'Redondo, serve ~20 fatias'
    ordem      SMALLINT NOT NULL DEFAULT 0,  -- ordenação na tela
    ativo      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_tamanho_nome UNIQUE (nome)
) ENGINE=InnoDB;

-- Receita-base.
--   rendimento_quantidade + rendimento_unidade_id = quanto a receita rende
--     ex.: brigadeiro  -> 100 un
--          recheio     -> 800 g  (informativo; bolos usam fator por tamanho)
CREATE TABLE receita (
    id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome                   VARCHAR(120) NOT NULL,
    tipo_receita_id        SMALLINT UNSIGNED NOT NULL,
    rendimento_quantidade  DECIMAL(14,4) NOT NULL DEFAULT 1,
    rendimento_unidade_id  SMALLINT UNSIGNED NOT NULL,
    modo_preparo           TEXT NULL,
    observacoes            VARCHAR(500) NULL,
    ativo                  BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_receita_nome UNIQUE (nome),
    CONSTRAINT fk_receita_tipo FOREIGN KEY (tipo_receita_id)
        REFERENCES tipo_receita (id),
    CONSTRAINT fk_receita_rend_unidade FOREIGN KEY (rendimento_unidade_id)
        REFERENCES unidade_medida (id),
    CONSTRAINT ck_receita_rendimento CHECK (rendimento_quantidade > 0)
) ENGINE=InnoDB;

-- Ingredientes da receita (N:N receita <-> ingrediente).
-- A unidade aqui é a da receita (ex.: 2 xícaras), não a do estoque;
-- o backend converte para a unidade de estoque no cálculo.
CREATE TABLE receita_ingrediente (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receita_id      INT UNSIGNED NOT NULL,
    ingrediente_id  INT UNSIGNED NOT NULL,
    quantidade      DECIMAL(14,4) NOT NULL,
    unidade_id      SMALLINT UNSIGNED NOT NULL,
    ordem           SMALLINT NOT NULL DEFAULT 0,
    observacao      VARCHAR(200) NULL,           -- 'peneirada', 'em temperatura ambiente'
    CONSTRAINT uk_receita_ingrediente UNIQUE (receita_id, ingrediente_id),
    CONSTRAINT fk_ri_receita FOREIGN KEY (receita_id)
        REFERENCES receita (id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_ingrediente FOREIGN KEY (ingrediente_id)
        REFERENCES ingrediente (id),
    CONSTRAINT fk_ri_unidade FOREIGN KEY (unidade_id)
        REFERENCES unidade_medida (id),
    CONSTRAINT ck_ri_quantidade CHECK (quantidade > 0)
) ENGINE=InnoDB;

-- Fator de escala por receita e tamanho (NÃO linear, configurável).
--   ex.: Massa de chocolate: 20 cm = 1.0 | 25 cm = 1.6 | 30 cm = 2.25
--        Recheio maracujá:   20 cm = 1.0 | 25 cm = 1.5 | 30 cm = 2.0
CREATE TABLE receita_fator_tamanho (
    receita_id  INT UNSIGNED NOT NULL,
    tamanho_id  SMALLINT UNSIGNED NOT NULL,
    fator       DECIMAL(12,6) NOT NULL,
    PRIMARY KEY (receita_id, tamanho_id),
    CONSTRAINT fk_rft_receita FOREIGN KEY (receita_id)
        REFERENCES receita (id) ON DELETE CASCADE,
    CONSTRAINT fk_rft_tamanho FOREIGN KEY (tamanho_id)
        REFERENCES tamanho (id),
    CONSTRAINT ck_rft_fator CHECK (fator > 0)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. PRODUTOS (catálogo)
-- ---------------------------------------------------------------------
-- modo_calculo:
--   'tamanho'    -> bolos/tortas. Cada componente usa o fator da
--                   receita para o tamanho escolhido x quantidade.
--   'rendimento' -> brigadeiros, docinhos. fator = (quantidade pedida x
--                   componente.quantidade_por_unidade) / rendimento da receita.
--
-- Produto simples      = 1 componente com 1 única opção de receita.
-- Produto personalizável = vários componentes (massa, recheio,
--                          cobertura), cada um com várias opções.
-- =====================================================================
CREATE TABLE produto (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(120) NOT NULL,
    descricao       VARCHAR(500) NULL,
    tipo            ENUM('simples','personalizavel') NOT NULL,
    modo_calculo    ENUM('tamanho','rendimento') NOT NULL,
    preco_base      DECIMAL(12,2) NULL,          -- preço por unidade (modo rendimento)
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_produto_nome UNIQUE (nome)
) ENGINE=InnoDB;

-- Tamanhos oferecidos para o produto (modo 'tamanho') e preço de cada um.
CREATE TABLE produto_tamanho (
    produto_id  INT UNSIGNED NOT NULL,
    tamanho_id  SMALLINT UNSIGNED NOT NULL,
    preco       DECIMAL(12,2) NULL,
    PRIMARY KEY (produto_id, tamanho_id),
    CONSTRAINT fk_pt_produto FOREIGN KEY (produto_id)
        REFERENCES produto (id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_tamanho FOREIGN KEY (tamanho_id)
        REFERENCES tamanho (id)
) ENGINE=InnoDB;

-- Componentes do produto: 'Massa', 'Recheio', 'Cobertura', 'Brigadeiro'...
--   quantidade_por_unidade (modo 'rendimento'): quantas unidades de
--   rendimento da receita cada unidade vendida consome.
--     ex.: 'Brigadeiro' avulso   -> 1   (1 brigadeiro)
--          'Caixa c/ 25'         -> 25
CREATE TABLE produto_componente (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    produto_id              INT UNSIGNED NOT NULL,
    nome                    VARCHAR(60) NOT NULL,
    obrigatorio             BOOLEAN NOT NULL DEFAULT TRUE,
    quantidade_por_unidade  DECIMAL(14,4) NOT NULL DEFAULT 1,
    ordem                   SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_componente_nome UNIQUE (produto_id, nome),
    CONSTRAINT fk_pc_produto FOREIGN KEY (produto_id)
        REFERENCES produto (id) ON DELETE CASCADE,
    CONSTRAINT ck_pc_qtd CHECK (quantidade_por_unidade > 0)
) ENGINE=InnoDB;

-- Receitas que podem ser escolhidas para cada componente.
--   ex.: Bolo > Recheio: brigadeiro, maracujá, doce de leite...
CREATE TABLE produto_componente_opcao (
    componente_id     INT UNSIGNED NOT NULL,
    receita_id        INT UNSIGNED NOT NULL,
    preco_adicional   DECIMAL(12,2) NOT NULL DEFAULT 0,
    padrao            BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (componente_id, receita_id),
    CONSTRAINT fk_pco_componente FOREIGN KEY (componente_id)
        REFERENCES produto_componente (id) ON DELETE CASCADE,
    CONSTRAINT fk_pco_receita FOREIGN KEY (receita_id)
        REFERENCES receita (id)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. CLIENTES
-- =====================================================================
CREATE TABLE cliente (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome           VARCHAR(150) NOT NULL,
    telefone       VARCHAR(30)  NULL,
    email          VARCHAR(150) NULL,
    endereco       VARCHAR(300) NULL,
    observacoes    VARCHAR(500) NULL,
    ativo          BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_cliente_nome (nome),
    INDEX ix_cliente_telefone (telefone)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. ENCOMENDAS
-- ---------------------------------------------------------------------
-- Fluxo de status:
--   orcamento  -> ainda não compromete estoque (entra na lista de
--                 compras só se o usuário escolher incluir).
--   confirmada -> backend grava o SNAPSHOT dos ingredientes em
--                 `encomenda_necessidade`; esses ingredientes passam a
--                 contar como RESERVADOS.
--   em_producao-> backend registra a baixa (movimentação 'producao')
--                 e preenche `estoque_baixado_em`; a reserva deixa de
--                 existir porque o estoque físico já foi debitado.
--   pronta / entregue -> fim do fluxo.
--   cancelada  -> reserva é liberada automaticamente (status muda).
-- =====================================================================
CREATE TABLE encomenda (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id          INT UNSIGNED NOT NULL,
    data_pedido         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_entrega        DATETIME NOT NULL,
    status              ENUM('orcamento','confirmada','em_producao','pronta','entregue','cancelada')
                            NOT NULL DEFAULT 'orcamento',
    valor_total         DECIMAL(12,2) NULL,
    observacoes         VARCHAR(1000) NULL,
    confirmada_em       DATETIME NULL,
    estoque_baixado_em  DATETIME NULL,
    criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_encomenda_cliente FOREIGN KEY (cliente_id)
        REFERENCES cliente (id),
    INDEX ix_encomenda_entrega (data_entrega),
    INDEX ix_encomenda_status_entrega (status, data_entrega)
) ENGINE=InnoDB;

-- Histórico de mudanças de status (auditoria).
CREATE TABLE encomenda_status_historico (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    encomenda_id     INT UNSIGNED NOT NULL,
    status_anterior  VARCHAR(20) NULL,
    status_novo      VARCHAR(20) NOT NULL,
    alterado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacao       VARCHAR(300) NULL,
    CONSTRAINT fk_esh_encomenda FOREIGN KEY (encomenda_id)
        REFERENCES encomenda (id) ON DELETE CASCADE,
    INDEX ix_esh_encomenda (encomenda_id, alterado_em)
) ENGINE=InnoDB;

-- Itens da encomenda.
--   tamanho_id obrigatório para produtos modo 'tamanho' (validado no backend).
CREATE TABLE encomenda_item (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    encomenda_id     INT UNSIGNED NOT NULL,
    produto_id       INT UNSIGNED NOT NULL,
    tamanho_id       SMALLINT UNSIGNED NULL,
    quantidade       DECIMAL(14,4) NOT NULL,
    preco_unitario   DECIMAL(12,2) NULL,
    observacoes      VARCHAR(500) NULL,         -- 'escrever Parabéns Ana'
    CONSTRAINT fk_ei_encomenda FOREIGN KEY (encomenda_id)
        REFERENCES encomenda (id) ON DELETE CASCADE,
    CONSTRAINT fk_ei_produto FOREIGN KEY (produto_id)
        REFERENCES produto (id),
    CONSTRAINT fk_ei_tamanho FOREIGN KEY (tamanho_id)
        REFERENCES tamanho (id),
    CONSTRAINT ck_ei_quantidade CHECK (quantidade > 0)
) ENGINE=InnoDB;

-- Personalização: qual receita foi escolhida para cada componente.
CREATE TABLE encomenda_item_componente (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id           INT UNSIGNED NOT NULL,
    componente_id     INT UNSIGNED NOT NULL,
    receita_id        INT UNSIGNED NOT NULL,
    CONSTRAINT uk_eic UNIQUE (item_id, componente_id),
    CONSTRAINT fk_eic_item FOREIGN KEY (item_id)
        REFERENCES encomenda_item (id) ON DELETE CASCADE,
    CONSTRAINT fk_eic_componente FOREIGN KEY (componente_id)
        REFERENCES produto_componente (id),
    CONSTRAINT fk_eic_receita FOREIGN KEY (receita_id)
        REFERENCES receita (id)
) ENGINE=InnoDB;

-- SNAPSHOT do cálculo de ingredientes, gravado pelo backend quando a
-- encomenda é CONFIRMADA. Garante que alterações futuras em receitas
-- ou fatores NÃO mudem o histórico de pedidos confirmados.
-- Quantidade sempre na unidade de ESTOQUE do ingrediente, sem
-- arredondamento (arredondar só na exibição / lista de compras).
CREATE TABLE encomenda_necessidade (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    encomenda_id          INT UNSIGNED NOT NULL,
    item_id               INT UNSIGNED NOT NULL,
    componente_id         INT UNSIGNED NULL,
    receita_id            INT UNSIGNED NOT NULL,
    receita_nome          VARCHAR(120) NOT NULL,    -- cópia do nome na data
    fator_escala          DECIMAL(12,6) NOT NULL,
    ingrediente_id        INT UNSIGNED NOT NULL,
    quantidade            DECIMAL(14,4) NOT NULL,   -- unidade de estoque
    unidade_id            SMALLINT UNSIGNED NOT NULL,
    calculado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_en_encomenda FOREIGN KEY (encomenda_id)
        REFERENCES encomenda (id) ON DELETE CASCADE,
    CONSTRAINT fk_en_item FOREIGN KEY (item_id)
        REFERENCES encomenda_item (id) ON DELETE CASCADE,
    CONSTRAINT fk_en_componente FOREIGN KEY (componente_id)
        REFERENCES produto_componente (id) ON DELETE SET NULL,
    CONSTRAINT fk_en_receita FOREIGN KEY (receita_id)
        REFERENCES receita (id),
    CONSTRAINT fk_en_ingrediente FOREIGN KEY (ingrediente_id)
        REFERENCES ingrediente (id),
    CONSTRAINT fk_en_unidade FOREIGN KEY (unidade_id)
        REFERENCES unidade_medida (id),
    INDEX ix_en_encomenda_ingrediente (encomenda_id, ingrediente_id),
    INDEX ix_en_ingrediente (ingrediente_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 7. ESTOQUE
-- ---------------------------------------------------------------------
-- Livro-razão de movimentações. `quantidade` é COM SINAL e na unidade
-- de estoque do ingrediente:
--   entrada  (+)   compra, doação
--   saida    (-)   uso fora de encomenda
--   producao (-)   baixa automática ao iniciar a produção de encomenda
--   perda    (-)   vencido, estragado, queimou
--   ajuste   (+/-) correção após contagem física
-- Os campos *_informada guardam o que o usuário digitou (ex.: 2 kg)
-- para auditoria. Movimentações não são editadas nem apagadas:
-- corrija lançando um 'ajuste'.
-- =====================================================================
CREATE TABLE movimentacao_estoque (
    id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ingrediente_id         INT UNSIGNED NOT NULL,
    tipo                   ENUM('entrada','saida','producao','perda','ajuste') NOT NULL,
    quantidade             DECIMAL(14,4) NOT NULL,
    quantidade_informada   DECIMAL(14,4) NULL,
    unidade_informada_id   SMALLINT UNSIGNED NULL,
    custo_total            DECIMAL(12,2) NULL,      -- valor pago (entradas)
    encomenda_id           INT UNSIGNED NULL,
    data_movimento         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacao             VARCHAR(300) NULL,
    criado_em              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_ingrediente FOREIGN KEY (ingrediente_id)
        REFERENCES ingrediente (id),
    CONSTRAINT fk_mov_unidade FOREIGN KEY (unidade_informada_id)
        REFERENCES unidade_medida (id),
    CONSTRAINT fk_mov_encomenda FOREIGN KEY (encomenda_id)
        REFERENCES encomenda (id),
    CONSTRAINT ck_mov_sinal CHECK (
        (tipo = 'entrada' AND quantidade > 0) OR
        (tipo IN ('saida','producao','perda') AND quantidade < 0) OR
        (tipo = 'ajuste' AND quantidade <> 0)
    ),
    INDEX ix_mov_ingrediente_data (ingrediente_id, data_movimento),
    INDEX ix_mov_encomenda (encomenda_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 8. TRIGGERS — mantêm ingrediente.estoque_atual consistente
-- =====================================================================
DELIMITER $$

CREATE TRIGGER trg_mov_estoque_ai
AFTER INSERT ON movimentacao_estoque
FOR EACH ROW
BEGIN
    UPDATE ingrediente
       SET estoque_atual = estoque_atual + NEW.quantidade
     WHERE id = NEW.ingrediente_id;
END$$

CREATE TRIGGER trg_mov_estoque_bu
BEFORE UPDATE ON movimentacao_estoque
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Movimentações de estoque não podem ser alteradas. Lance um ajuste.';
END$$

CREATE TRIGGER trg_mov_estoque_bd
BEFORE DELETE ON movimentacao_estoque
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Movimentações de estoque não podem ser excluídas. Lance um ajuste.';
END$$

-- Registra automaticamente o histórico de status das encomendas.
CREATE TRIGGER trg_encomenda_ai
AFTER INSERT ON encomenda
FOR EACH ROW
BEGIN
    INSERT INTO encomenda_status_historico (encomenda_id, status_anterior, status_novo)
    VALUES (NEW.id, NULL, NEW.status);
END$$

CREATE TRIGGER trg_encomenda_au
AFTER UPDATE ON encomenda
FOR EACH ROW
BEGIN
    IF NOT (OLD.status <=> NEW.status) THEN
        INSERT INTO encomenda_status_historico (encomenda_id, status_anterior, status_novo)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- 9. VIEWS — consultas de estoque (somas simples; os cálculos de
--    receita/escala ficam no backend, conforme regra de negócio)
-- =====================================================================

-- Reservado = snapshot das encomendas CONFIRMADAS cuja baixa ainda não
-- foi feita.
CREATE VIEW vw_estoque_reservado AS
SELECT n.ingrediente_id,
       SUM(n.quantidade) AS quantidade_reservada
  FROM encomenda_necessidade n
  JOIN encomenda e ON e.id = n.encomenda_id
 WHERE e.status = 'confirmada'
   AND e.estoque_baixado_em IS NULL
 GROUP BY n.ingrediente_id;

-- Posição de estoque: físico, reservado, disponível e alerta de mínimo.
CREATE VIEW vw_estoque AS
SELECT i.id                                         AS ingrediente_id,
       i.nome                                       AS ingrediente,
       u.codigo                                     AS unidade,
       i.estoque_atual                              AS estoque_fisico,
       COALESCE(r.quantidade_reservada, 0)          AS estoque_reservado,
       i.estoque_atual - COALESCE(r.quantidade_reservada, 0) AS estoque_disponivel,
       i.estoque_minimo,
       (i.estoque_atual - COALESCE(r.quantidade_reservada, 0)) < i.estoque_minimo
                                                    AS abaixo_minimo,
       i.embalagem_quantidade,
       i.embalagem_descricao,
       i.ativo
  FROM ingrediente i
  JOIN unidade_medida u ON u.id = i.unidade_estoque_id
  LEFT JOIN vw_estoque_reservado r ON r.ingrediente_id = i.id;

-- Necessidade consolidada por encomenda (a partir do snapshot).
CREATE VIEW vw_encomenda_necessidade AS
SELECT n.encomenda_id,
       e.status,
       e.data_entrega,
       n.ingrediente_id,
       i.nome        AS ingrediente,
       u.codigo      AS unidade,
       SUM(n.quantidade) AS quantidade
  FROM encomenda_necessidade n
  JOIN encomenda e      ON e.id = n.encomenda_id
  JOIN ingrediente i    ON i.id = n.ingrediente_id
  JOIN unidade_medida u ON u.id = n.unidade_id
 GROUP BY n.encomenda_id, e.status, e.data_entrega,
          n.ingrediente_id, i.nome, u.codigo;
