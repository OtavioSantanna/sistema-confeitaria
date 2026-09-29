# Sistema de Gestão de Confeitaria

Sistema para planejar encomendas de uma confeitaria e saber **antes** o que precisa ser comprado.
Calcula os ingredientes de cada encomenda (com fatores de escala por tamanho e por rendimento),
controla o estoque (físico, reservado e disponível) e gera a lista de compras.

| Parte     | Tecnologia                  | Pasta       |
|-----------|-----------------------------|-------------|
| Banco     | MySQL 8.4                   | `database/` |
| API REST  | Node.js 22 + Express 5      | `backend/`  |
| Web       | React 19 + Vite             | `frontend/` |
| Execução  | Docker Compose              | raiz        |

> **Estado atual:** banco de dados completo + Docker. A API e o frontend têm só o esqueleto
> (rota `/api/v1/health`) para validar que tudo se conecta.

## Como rodar

```bash
cp .env.example .env        # troque as senhas
docker compose up -d --build
```

| Serviço           | Endereço                                  |
|-------------------|-------------------------------------------|
| Frontend          | http://localhost:5174                     |
| API               | http://localhost:3001/api/v1/health       |
| Adminer (banco)   | http://localhost:8081 — servidor `mysql`  |
| MySQL (externo)   | `localhost:3307` (DBeaver, Workbench...)  |

As portas 3306, 5173, 8000 e 8080 ficaram livres para o outro projeto. Todas podem ser alteradas no `.env`.

Comandos úteis:

```bash
docker compose logs -f api          # logs da API
docker compose down                 # para tudo (dados preservados)
docker compose down -v              # APAGA o banco; na próxima subida ele é recriado
                                    # a partir de database/init/*.sql
```

> Os scripts de `database/init/` só rodam quando o volume do banco está **vazio**.
> Alterou o schema? Rode `docker compose down -v` e suba de novo (em desenvolvimento).

Para validar o modelo (calcula a encomenda de exemplo, confirma, dá baixa e desfaz tudo no final):

```bash
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 -t "$MYSQL_DATABASE"' < database/testes/validar-modelo.sql
```

## Banco de dados

```
database/init/01-schema.sql        tabelas, triggers e views
database/init/02-dados-base.sql    unidades de medida, tipos de receita, tamanhos
database/init/03-dados-exemplo.sql ingredientes, receitas, produtos e 1 encomenda de exemplo
database/testes/validar-modelo.sql roteiro de validação (não altera o banco)
```

Para começar **sem** dados de exemplo, apague `03-dados-exemplo.sql` antes da primeira subida.

### Modelo

```
unidade_medida ─┬─ ingrediente ── ingrediente_conversao
                │       │
                │  receita_ingrediente ── receita ── receita_fator_tamanho ── tamanho
                │                           │                                  │
                │         produto_componente_opcao                     produto_tamanho
                │                           │                                  │
                │                  produto_componente ────── produto ──────────┘
                │                           │
cliente ── encomenda ── encomenda_item ── encomenda_item_componente
                │             │
                │      encomenda_necessidade   (snapshot ao confirmar)
                │
       movimentacao_estoque ── (trigger) ── ingrediente.estoque_atual
```

**Unidades e conversão.** Cada unidade tem uma grandeza (massa, volume, contagem) e um fator para a
unidade-base (g, ml, un). Mesma grandeza converte sozinha (kg → g, xícara → ml). Entre grandezas diferentes
(xícara de farinha → g, lata de leite condensado → g) usa-se `ingrediente_conversao`. Ordem no cálculo:
1º conversão do ingrediente, 2º mesma grandeza, senão erro de unidade incompatível.

**Receitas e escala.**
- Bolos (produto `modo_calculo = 'tamanho'`): cada componente (massa, recheio, cobertura) aponta para uma
  receita, e o fator vem de `receita_fator_tamanho` — configurável por receita e tamanho, sem assumir proporção linear.
- Brigadeiros e similares (`modo_calculo = 'rendimento'`):
  `fator = quantidade pedida × quantidade_por_unidade ÷ rendimento da receita`
  (ex.: 300 brigadeiros ÷ receita de 100 = 3; uma "caixa com 25" tem `quantidade_por_unidade = 25`).

**Fluxo da encomenda e do estoque.**

| Status        | O que o backend faz                                                           | Efeito no estoque          |
|---------------|-------------------------------------------------------------------------------|----------------------------|
| `orcamento`   | calcula ao vivo a partir das receitas atuais                                  | nenhum                     |
| `confirmada`  | grava o snapshot em `encomenda_necessidade`                                   | ingredientes **reservados** |
| `em_producao` | lança movimentações `producao` e preenche `estoque_baixado_em`                | físico debitado, reserva liberada |
| `pronta` / `entregue` | —                                                                     | —                          |
| `cancelada`   | —                                                                             | reserva liberada           |

- O snapshot garante que alterar uma receita depois **não** muda pedidos já confirmados.
- `ingrediente.estoque_atual` é mantido por trigger a partir de `movimentacao_estoque`.
  Movimentações não podem ser editadas nem apagadas: corrija lançando um `ajuste`.
- `vw_estoque` mostra físico, reservado, disponível e alerta de estoque mínimo.
- O histórico de status é gravado automaticamente em `encomenda_status_historico`.

**Precisão.** Quantidades em `DECIMAL(14,4)`, fatores em `DECIMAL(12,6)`. O snapshot guarda o valor sem
arredondar. O arredondamento acontece só na apresentação: para produção (ex.: 9,2 ovos → 10) e para compra
(`ingrediente.embalagem_quantidade`, ex.: faltam 4.029 g de leite condensado → 11 latas de 395 g).

## Notas para o backend

- **Cálculos no backend**, como pede a regra de negócio. A consulta em `database/testes/validar-modelo.sql`
  é a referência da lógica (fator, conversão, agrupamento).
- O `mysql2` devolve `DECIMAL` como **string**, de propósito. Use `decimal.js` (ou similar) nos cálculos,
  nunca `Number`, para não perder precisão.
- Operações que mexem em várias tabelas (confirmar encomenda, iniciar produção) devem usar
  `withTransaction()` de `backend/src/database/pool.js`.
- Um `INSERT ... SELECT` em `movimentacao_estoque` que leia a tabela `ingrediente` falha (limitação do MySQL
  com triggers). Resolva os ids antes ou insira com `VALUES`.
- Camadas: `routes → controllers → services (regras e cálculos) → repositories (SQL)`.

## App de celular (futuro)

A API já está preparada para um app em Kotlin ou Flutter/Dart:
- rotas versionadas em `/api/v1`, para evoluir sem quebrar o app;
- escuta em `0.0.0.0`, então um celular na mesma rede Wi-Fi acessa `http://<IP-do-PC>:3001/api/v1/...`
  (no emulador Android, use `http://10.0.2.2:3001`);
- CORS só afeta navegadores; o app nativo não precisa de configuração extra.

Quando o app for para fora da rede local, vai precisar de autenticação (ex.: JWT) e HTTPS.
