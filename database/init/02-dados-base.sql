-- =====================================================================
-- Dados de referência — necessários para o sistema funcionar.
-- =====================================================================
SET NAMES utf8mb4;

-- Unidades-base: g (massa), ml (volume), un (contagem) -> fator 1
INSERT INTO unidade_medida (codigo, nome, grandeza, fator_base, casas_decimais) VALUES
    ('g',    'grama',            'massa',     1,     0),
    ('kg',   'quilograma',       'massa',     1000,  3),
    ('ml',   'mililitro',        'volume',    1,     0),
    ('l',    'litro',            'volume',    1000,  3),
    ('xic',  'xícara (240 ml)',  'volume',    240,   2),
    ('cs',   'colher de sopa',   'volume',    15,    1),
    ('cc',   'colher de chá',    'volume',    5,     1),
    ('un',   'unidade',          'contagem',  1,     0),
    ('dz',   'dúzia',            'contagem',  12,    1),
    -- Embalagens: o peso/volume real depende do ingrediente e é
    -- definido em ingrediente_conversao (ex.: lata de leite condensado = 395 g).
    ('lata', 'lata',             'contagem',  1,     0),
    ('cx',   'caixa',            'contagem',  1,     0),
    ('pct',  'pacote',           'contagem',  1,     0);

INSERT INTO tipo_receita (nome) VALUES
    ('Massa'), ('Recheio'), ('Cobertura'), ('Brigadeiro'),
    ('Docinho'), ('Torta'), ('Outro');

INSERT INTO tamanho (nome, descricao, ordem) VALUES
    ('15 cm', 'Redondo — serve ~10 fatias', 1),
    ('20 cm', 'Redondo — serve ~20 fatias', 2),
    ('25 cm', 'Redondo — serve ~30 fatias', 3),
    ('30 cm', 'Redondo — serve ~45 fatias', 4);
