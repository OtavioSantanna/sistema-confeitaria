-- =========================================================
-- Ingredientes (estoque)
-- =========================================================
CREATE TABLE ingrediente (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nome                VARCHAR(100) NOT NULL,
    unidade_medida      ENUM('g','kg','ml','l','unidade') NOT NULL DEFAULT 'g',
    quantidade_estoque  DECIMAL(10,3) NOT NULL DEFAULT 0,
    estoque_minimo      DECIMAL(10,3) NOT NULL DEFAULT 0,
    preco_unitario      DECIMAL(10,2) DEFAULT NULL,
    fornecedor          VARCHAR(100) DEFAULT NULL,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- Receita (cadastro geral - bolo ou brigadeiro)
-- =========================================================
CREATE TABLE receita (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nome                VARCHAR(150) NOT NULL,
    tipo                ENUM('bolo','brigadeiro') NOT NULL,
    tamanho_padrao      VARCHAR(50) DEFAULT NULL,   -- ex: "Forma redonda 20cm"
    rendimento_padrao   DECIMAL(10,2) DEFAULT NULL, -- ex: 40 (unidades de brigadeiro)
    unidade_rendimento  VARCHAR(30) DEFAULT NULL,   -- ex: 'unidades', 'fatias'
    sabor               VARCHAR(100) DEFAULT NULL,  -- usado principalmente em brigadeiros
    descricao           TEXT,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- Partes da receita (massa / recheio / cobertura / único)
-- Bolo gera 3 registros, brigadeiro gera 1 (tipo 'unico')
-- =========================================================
CREATE TABLE receita_parte (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    receita_id              INT NOT NULL,
    tipo_parte              ENUM('massa','recheio','cobertura','unico') NOT NULL,
    tamanho_referencia      VARCHAR(50) DEFAULT NULL,  -- tamanho de forma referente a essa massa
    rendimento_referencia   DECIMAL(10,2) DEFAULT NULL,
    observacoes             TEXT,
    FOREIGN KEY (receita_id) REFERENCES receita(id) ON DELETE CASCADE,
    UNIQUE KEY uk_receita_tipo (receita_id, tipo_parte)
) ENGINE=InnoDB;

-- =========================================================
-- Ingredientes de cada parte da receita
-- =========================================================
CREATE TABLE receita_parte_ingrediente (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    receita_parte_id    INT NOT NULL,
    ingrediente_id      INT NOT NULL,
    quantidade          DECIMAL(10,3) NOT NULL,
    unidade_medida      ENUM('g','kg','ml','l','unidade') NOT NULL,
    FOREIGN KEY (receita_parte_id) REFERENCES receita_parte(id) ON DELETE CASCADE,
    FOREIGN KEY (ingrediente_id) REFERENCES ingrediente(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_parte_ingrediente (receita_parte_id, ingrediente_id)
) ENGINE=InnoDB;

-- =========================================================
-- Pedidos
-- =========================================================
CREATE TABLE pedido (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    cliente_nome    VARCHAR(150) NOT NULL,
    cliente_contato VARCHAR(100),
    data_pedido     DATE NOT NULL DEFAULT (CURRENT_DATE),
    data_entrega    DATE,
    status          ENUM('orcamento','confirmado','em_producao','concluido','cancelado')
                        NOT NULL DEFAULT 'orcamento',
    observacoes     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- Itens do pedido (quais receitas e quantas)
-- =========================================================
CREATE TABLE pedido_item (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id           INT NOT NULL,
    receita_id          INT NOT NULL,
    tamanho_solicitado  VARCHAR(50) DEFAULT NULL,
    quantidade          DECIMAL(10,2) NOT NULL DEFAULT 1,
    observacoes         TEXT,
    FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE CASCADE,
    FOREIGN KEY (receita_id) REFERENCES receita(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =========================================================
-- Histórico de movimentação do estoque
-- =========================================================
CREATE TABLE estoque_movimentacao (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    ingrediente_id  INT NOT NULL,
    tipo            ENUM('entrada','saida','ajuste') NOT NULL,
    quantidade      DECIMAL(10,3) NOT NULL,
    motivo          VARCHAR(255),
    pedido_id       INT DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingrediente_id) REFERENCES ingrediente(id),
    FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE SET NULL
) ENGINE=InnoDB;