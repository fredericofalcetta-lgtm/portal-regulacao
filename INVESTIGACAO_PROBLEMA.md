# Investigação: Problema de Duplicação de Check-ins em Agendas sem Município

## Resumo Executivo

**Problema relatado:** Agendas sem município estão perdendo sua central durante a sincronização, causando check-ins em múltiplas agendas inespecíficas.

**Causa raiz identificada:** O problema NÃO é perda de dados na sincronização, mas sim uma **falha na lógica do JOIN** entre as tabelas `check_ins`/`encaminhamentos` e `regulacao_data`.

## Dados do Banco Atual

### Estatísticas Gerais
- **Total de agendas no banco:** ~3.555 agendas
- **Agendas com município vazio (''):** 774 agendas (21.8%)
- **Agendas duplicadas (mesmo nome + município + central):** 0 (não há duplicatas exatas)

### Estrutura dos Dados
A planilha Google Sheets contém agendas em dois formatos:

1. **Com município:** `ORTOPEDIA ADULTO` em `FARROUPILHA` (central `5CRS`)
2. **Sem município:** `ORTOPEDIA ADULTO` em `` (vazio) (central `15CRS`)

Exemplo real encontrado:
```
ORTOPEDIA ADULTO com município='':
- id 842733: central='14CRS'
- id 843029: central='5CRS'
- id 843198: central='8CRS'
- id 843347: central='13CRS'
- id 843507: central='16CRS'
- id 840182: central='1CRS'
- id 841696: central='3CRS'
- id 841894: central='7CRS'
- id 842381: central='4CRS'
- id 842850: central='17CRS'
- id 843403: central='16CRS'
- id 841113: central='6CRS'
- id 840795: central='18CRS'
- id 842583: central='15CRS'
- id 843244: central='13CRS'
- id 841001: central='11CRS'
```

## Problema na Lógica do JOIN

### Código Atual (Incorreto)

```typescript
// Em routers.ts, procedures getMeus e getMinhas
.leftJoin(
  regulacaoData,
  and(
    eq(checkIns.agendaNome, regulacaoData.agenda),
    or(
      isNull(checkIns.municipio),  // ← PROBLEMA AQUI
      eq(checkIns.municipio, regulacaoData.municipio)
    ),
    or(
      isNull(checkIns.central),
      eq(checkIns.central, regulacaoData.central)
    )
  )
)
```

### Por que isso causa o problema?

Quando um usuário faz check-in em `ORTOPEDIA ADULTO` (municipio='', central='15CRS'):

1. O check-in é salvo com `municipio = ''` (string vazia, não NULL)
2. No JOIN, a condição `isNull(checkIns.municipio)` retorna **FALSE** (porque `''` não é NULL)
3. Então a condição se torna: `'' = regulacaoData.municipio`
4. Isso faz match com **TODAS as 774 agendas** que têm `municipio = ''`
5. Como existem 16 agendas `ORTOPEDIA ADULTO` com `municipio = ''` (uma para cada central), o check-in aparece em todas elas!

### Evidência do Problema

Encaminhamentos encontrados que fazem JOIN com múltiplas agendas:

```
┌─────────┬─────────┬────────────────────┬─────────────┬───────────┬─────────────┐
│ (index) │ id      │ agenda_nome        │ e_municipio │ e_central │ qtd_matches │
├─────────┼─────────┼────────────────────┼─────────────┼───────────┼─────────────┤
│ 0       │ 1140002 │ 'ORTOPEDIA ADULTO' │ ''          │ '3CRS'    │ 3           │
│ 1       │ 1140003 │ 'ORTOPEDIA ADULTO' │ ''          │ '11CRS'   │ 2           │
│ 2       │ 1140001 │ 'ORTOPEDIA ADULTO' │ ''          │ '15CRS'   │ 4           │
└─────────┴─────────┴────────────────────┴─────────────┴───────────┴─────────────┘
```

O encaminhamento `id=1140001` para `ORTOPEDIA ADULTO` (central='15CRS') está fazendo match com **4 agendas diferentes** no banco!

## Solução Proposta

### Opção 1: JOIN Estrito (Recomendada)

Usar a **chave composta completa** (agenda + município + central) no JOIN, tratando strings vazias como valores específicos:

```typescript
.leftJoin(
  regulacaoData,
  and(
    eq(checkIns.agendaNome, regulacaoData.agenda),
    eq(checkIns.municipio, regulacaoData.municipio),  // Match exato ('' = '')
    eq(checkIns.central, regulacaoData.central)        // Match exato
  )
)
```

**Vantagens:**
- Simples e direto
- Garante match 1:1 entre check-in e agenda
- Trata '' como valor específico (não como wildcard)

**Desvantagens:**
- Se houver inconsistência entre check-in e regulacao_data (ex: central mudou), o JOIN falha

### Opção 2: COALESCE para Normalizar Vazios

Tratar strings vazias como NULL em ambos os lados:

```typescript
.leftJoin(
  regulacaoData,
  and(
    eq(checkIns.agendaNome, regulacaoData.agenda),
    sql`COALESCE(NULLIF(${checkIns.municipio}, ''), 'NULL_MARKER') = COALESCE(NULLIF(${regulacaoData.municipio}, ''), 'NULL_MARKER')`,
    sql`COALESCE(NULLIF(${checkIns.central}, ''), 'NULL_MARKER') = COALESCE(NULLIF(${regulacaoData.central}, ''), 'NULL_MARKER')`
  )
)
```

**Vantagens:**
- Normaliza NULL e '' como equivalentes
- Mais robusto para dados inconsistentes

**Desvantagens:**
- Mais complexo
- Usa SQL raw (menos type-safe)

## Recomendação Final

**Usar Opção 1 (JOIN Estrito)** porque:

1. A sincronização já está funcionando corretamente (não há perda de dados)
2. O problema é apenas no JOIN (match incorreto)
3. A chave composta (agenda + município + central) já é usada em outros lugares do código
4. É mais simples e mantém type-safety do Drizzle ORM

## Arquivos a Corrigir

1. `server/routers.ts`:
   - Procedure `checkIns.getMeus` (linha ~494-509)
   - Procedure `checkIns.getAll` (linha ~562-576)
   - Procedure `encaminhamentos.getMinhas` (linha ~308-323)

2. Verificar se há outros JOINs com a mesma lógica incorreta.

## Próximos Passos

1. Corrigir os JOINs nas três procedures identificadas
2. Executar testes para validar a correção
3. Verificar no browser se check-ins agora aparecem apenas na agenda correta
4. Documentar a mudança no todo.md
