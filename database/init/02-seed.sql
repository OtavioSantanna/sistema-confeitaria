-- Ingredientes
INSERT INTO ingrediente (nome, unidade_medida, quantidade_estoque, estoque_minimo) VALUES
('Farinha de trigo', 'kg', 5.000, 1.000),
('Açúcar', 'kg', 3.000, 1.000),
('Leite condensado', 'unidade', 10.000, 2.000),
('Chocolate em pó', 'g', 500.000, 100.000),
('Manteiga', 'g', 400.000, 100.000),
('Ovos', 'unidade', 24.000, 6.000);

-- Receita: Bolo de chocolate (forma 20cm)
INSERT INTO receita (nome, tipo, tamanho_padrao, descricao) VALUES
('Bolo de Chocolate', 'bolo', 'Forma redonda 20cm', 'Bolo de chocolate com recheio de brigadeiro');

SET @receita_bolo = LAST_INSERT_ID();

INSERT INTO receita_parte (receita_id, tipo_parte, tamanho_referencia) VALUES
(@receita_bolo, 'massa', 'Forma redonda 20cm'),
(@receita_bolo, 'recheio', 'Forma redonda 20cm'),
(@receita_bolo, 'cobertura', 'Forma redonda 20cm');

-- Ingredientes da massa
INSERT INTO receita_parte_ingrediente (receita_parte_id, ingrediente_id, quantidade, unidade_medida)
SELECT id, 1, 0.300, 'kg' FROM receita_parte WHERE receita_id = @receita_bolo AND tipo_parte = 'massa'
UNION ALL
SELECT id, 6, 3.000, 'unidade' FROM receita_parte WHERE receita_id = @receita_bolo AND tipo_parte = 'massa';

-- Receita: Brigadeiro tradicional
INSERT INTO receita (nome, tipo, sabor, rendimento_padrao, unidade_rendimento) VALUES
('Brigadeiro Tradicional', 'brigadeiro', 'Chocolate', 30, 'unidades');

SET @receita_brig = LAST_INSERT_ID();

INSERT INTO receita_parte (receita_id, tipo_parte, rendimento_referencia) VALUES
(@receita_brig, 'unico', 30);

INSERT INTO receita_parte_ingrediente (receita_parte_id, ingrediente_id, quantidade, unidade_medida)
SELECT id, 3, 2.000, 'unidade' FROM receita_parte WHERE receita_id = @receita_brig
UNION ALL
SELECT id, 4, 100.000, 'g' FROM receita_parte WHERE receita_id = @receita_brig
UNION ALL
SELECT id, 5, 30.000, 'g' FROM receita_parte WHERE receita_id = @receita_brig;