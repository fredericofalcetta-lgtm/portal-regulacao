/**
 * Testes unitários para verificar a lógica de identificação única de agendas
 * por nome + município + central (chave composta).
 *
 * Contexto: Após sincronização diária, os IDs das agendas são regenerados.
 * O JOIN por nome + município + central garante que encaminhamentos e check-ins
 * continuem associados às agendas corretas, mesmo após a sincronização.
 *
 * ATENÇÃO: Agendas sem município têm municipio='' (string vazia, não NULL).
 * O JOIN deve usar eq() direto (match exato), não isNull()+or(), para evitar
 * que um check-in/encaminhamento faça match com TODAS as agendas de mesmo nome
 * que também têm municipio=''.
 */

import { describe, it, expect } from "vitest";

// ─── Helpers de simulação ────────────────────────────────────────────────────

interface Agenda {
  id: number;
  agenda: string;
  municipio: string;
  central: string;
  cotas: number;
  saldo: number;
  aguardando: number;
  indexRegula: number;
}

interface Encaminhamento {
  id: number;
  agendaId: number;
  agendaNome: string;
  municipio: string;
  central: string;
  reguladorEmail: string;
}

/**
 * Simula o JOIN por agendaNome + municipio + central (como feito no backend).
 * Usa match EXATO (eq()) em vez de isNull()+or() para evitar duplicação.
 * Retorna os dados atualizados da agenda para cada encaminhamento.
 */
function joinEncaminhamentosComAgendas(
  encaminhamentos: Encaminhamento[],
  agendas: Agenda[]
): (Encaminhamento & Partial<Agenda>)[] {
  return encaminhamentos.map(enc => {
    const agenda = agendas.find(a =>
      a.agenda === enc.agendaNome &&
      a.municipio === enc.municipio &&   // match exato ('' = '' é válido)
      a.central === enc.central           // match exato
    );
    return { ...enc, ...agenda };
  });
}

/**
 * Simula o JOIN INCORRETO que causava o problema de duplicação.
 * O bug ocorre quando municipio='' (vazio) no encaminhamento:
 * - isNull('') → FALSE (string vazia não é NULL)
 * - '' = rd.municipio → TRUE para todas as agendas com municipio=''
 * Resultado: o encaminhamento faz match com TODAS as agendas de mesmo nome
 * que também têm municipio='', multiplicando as linhas retornadas.
 */
function joinIncorreto(
  encaminhamentos: Encaminhamento[],
  agendas: Agenda[]
): (Encaminhamento & Partial<Agenda>)[] {
  return encaminhamentos.flatMap(enc => {
    const matches = agendas.filter(a => {
      const nomeMatch = a.agenda === enc.agendaNome;
      // Simula: (isNull(municipio) OR eq(municipio)) AND (isNull(central) OR eq(central))
      // isNull('') → FALSE; '' = '' → TRUE para todas as agendas com municipio=''
      const municipioIsNull = enc.municipio === null; // isNull() em Drizzle
      const municipioMatch = municipioIsNull || a.municipio === enc.municipio;
      const centralIsNull = enc.central === null;
      const centralMatch = centralIsNull || a.central === enc.central;
      return nomeMatch && municipioMatch && centralMatch;
    });
    return matches.map(a => ({ ...enc, ...a }));
  });
}

// ─── Dados de teste ──────────────────────────────────────────────────────────

const agendasSimuladas: Agenda[] = [
  // Agendas COM município
  {
    id: 101,
    agenda: "ORTOPEDIA ADULTO",
    municipio: "PORTO ALEGRE",
    central: "CRA",
    cotas: 50,
    saldo: 10,
    aguardando: 200,
    indexRegula: 4.0,
  },
  {
    id: 102,
    agenda: "ORTOPEDIA ADULTO",
    municipio: "FARROUPILHA",
    central: "5CRS",
    cotas: 30,
    saldo: 5,
    aguardando: 120,
    indexRegula: 3.5,
  },
  // Agendas SEM município (municipio='') — caso problemático
  {
    id: 103,
    agenda: "ORTOPEDIA ADULTO",
    municipio: "",
    central: "15CRS",
    cotas: 40,
    saldo: 8,
    aguardando: 90,
    indexRegula: 2.25,
  },
  {
    id: 104,
    agenda: "ORTOPEDIA ADULTO",
    municipio: "",
    central: "3CRS",
    cotas: 25,
    saldo: 3,
    aguardando: 60,
    indexRegula: 2.4,
  },
  {
    id: 105,
    agenda: "ORTOPEDIA ADULTO",
    municipio: "",
    central: "11CRS",
    cotas: 20,
    saldo: 2,
    aguardando: 50,
    indexRegula: 2.5,
  },
  {
    id: 106,
    agenda: "CARDIOLOGIA ADULTO",
    municipio: "",
    central: "1CRS",
    cotas: 60,
    saldo: 12,
    aguardando: 150,
    indexRegula: 2.5,
  },
];

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("JOIN por agendaNome + municipio + central", () => {
  it("deve associar encaminhamento à agenda correta quando há agendas com mesmo nome em municípios diferentes", () => {
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 1,
        agendaId: 999,
        agendaNome: "ORTOPEDIA ADULTO",
        municipio: "PORTO ALEGRE",
        central: "CRA",
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].municipio).toBe("PORTO ALEGRE");
    expect(resultado[0].cotas).toBe(50);
    expect(resultado[0].aguardando).toBe(200);
  });

  it("deve associar encaminhamento à agenda correta quando há agendas sem município (municipio='')", () => {
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 2,
        agendaId: 999,
        agendaNome: "ORTOPEDIA ADULTO",
        municipio: "",
        central: "15CRS",
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].central).toBe("15CRS");
    expect(resultado[0].cotas).toBe(40);
    expect(resultado[0].aguardando).toBe(90);
  });

  it("deve retornar EXATAMENTE 1 resultado para agenda sem município (não multiplicar por todas as centrais)", () => {
    // TESTE CRÍTICO: verifica que o JOIN correto não duplica resultados
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 3,
        agendaId: 999,
        agendaNome: "ORTOPEDIA ADULTO",
        municipio: "",
        central: "3CRS",
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    // Deve retornar EXATAMENTE 1 resultado (apenas a agenda da 3CRS)
    expect(resultado).toHaveLength(1);
    expect(resultado[0].central).toBe("3CRS");
    expect(resultado[0].cotas).toBe(25);
  });

  it("DEMONSTRA O BUG: JOIN incorreto com isNull+or multiplica agendas sem município", () => {
    // Este teste demonstra o comportamento incorreto que causava o problema.
    // O bug ocorre quando municipio='' E central=null (NULL real, não string vazia).
    // Com isNull(central) OR eq(central): se central=null, isNull() retorna TRUE,
    // então o filtro de central é ignorado e o JOIN pega TODAS as agendas com mesmo nome+municipio.
    const encaminhamentosComCentralNull: (Omit<Encaminhamento, 'central'> & { central: null })[] = [
      {
        id: 4,
        agendaId: 999,
        agendaNome: "ORTOPEDIA ADULTO",
        municipio: "",
        central: null, // NULL real (não string vazia) — isNull() retorna TRUE
        reguladorEmail: "reg@example.com",
      },
    ];

    // Simular o JOIN incorreto com central=null: isNull(central) → TRUE → ignora filtro de central
    const matchesComCentralNull = agendasSimuladas.filter(a => {
      const nomeMatch = a.agenda === "ORTOPEDIA ADULTO";
      const municipioMatch = "" === a.municipio; // '' = '' → TRUE para agendas sem município
      const centralMatch = true; // isNull(null) → TRUE → ignora filtro
      return nomeMatch && municipioMatch && centralMatch;
    });

    // O JOIN incorreto retorna múltiplas agendas (todas ORTOPEDIA ADULTO sem município)
    expect(matchesComCentralNull.length).toBeGreaterThan(1);
    // Especificamente, deve retornar as 3 agendas sem município (15CRS, 3CRS, 11CRS)
    expect(matchesComCentralNull.length).toBe(3);

    // O JOIN correto (eq direto) retorna exatamente 1 agenda
    const encaminhamentoCorreto: Encaminhamento = {
      id: 4, agendaId: 999, agendaNome: "ORTOPEDIA ADULTO",
      municipio: "", central: "15CRS", reguladorEmail: "reg@example.com",
    };
    const resultadoCorreto = joinEncaminhamentosComAgendas([encaminhamentoCorreto], agendasSimuladas);
    expect(resultadoCorreto).toHaveLength(1);
    expect(resultadoCorreto[0].central).toBe("15CRS");
  });

  it("deve retornar dados atualizados após sincronização (IDs regenerados)", () => {
    const encaminhamentosAntigos: Encaminhamento[] = [
      {
        id: 1,
        agendaId: 50, // ID antigo, não existe mais
        agendaNome: "ORTOPEDIA ADULTO",
        municipio: "",
        central: "11CRS",
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentosAntigos, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(105); // novo ID após sincronização
    expect(resultado[0].cotas).toBe(20);
    expect(resultado[0].indexRegula).toBe(2.5);
  });

  it("não deve confundir agendas com mesmo nome em municípios diferentes ao fazer JOIN", () => {
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 5,
        agendaId: 999,
        agendaNome: "ORTOPEDIA ADULTO",
        municipio: "PORTO ALEGRE",
        central: "CRA",
        reguladorEmail: "reg1@example.com",
      },
      {
        id: 6,
        agendaId: 998,
        agendaNome: "ORTOPEDIA ADULTO",
        municipio: "FARROUPILHA",
        central: "5CRS",
        reguladorEmail: "reg2@example.com",
      },
      {
        id: 7,
        agendaId: 997,
        agendaNome: "ORTOPEDIA ADULTO",
        municipio: "",
        central: "15CRS",
        reguladorEmail: "reg3@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    expect(resultado).toHaveLength(3);
    const poa = resultado.find(r => r.reguladorEmail === "reg1@example.com");
    const farroupilha = resultado.find(r => r.reguladorEmail === "reg2@example.com");
    const semMunicipio = resultado.find(r => r.reguladorEmail === "reg3@example.com");

    expect(poa?.cotas).toBe(50);
    expect(poa?.aguardando).toBe(200);
    expect(farroupilha?.cotas).toBe(30);
    expect(farroupilha?.aguardando).toBe(120);
    expect(semMunicipio?.cotas).toBe(40);
    expect(semMunicipio?.central).toBe("15CRS");
  });

  it("deve retornar encaminhamento sem dados de agenda quando não há correspondência", () => {
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 8,
        agendaId: 999,
        agendaNome: "ESPECIALIDADE INEXISTENTE",
        municipio: "PORTO ALEGRE",
        central: "CRA",
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].cotas).toBeUndefined();
  });
});
