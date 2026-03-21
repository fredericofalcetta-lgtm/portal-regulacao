/**
 * Testes unitários para verificar a lógica de identificação única de agendas
 * por nome + município (chave composta).
 *
 * Contexto: Após sincronização diária, os IDs das agendas são regenerados.
 * O JOIN por nome + município garante que encaminhamentos e check-ins
 * continuem associados às agendas corretas, mesmo após a sincronização.
 */

import { describe, it, expect } from "vitest";

// ─── Helpers de simulação ────────────────────────────────────────────────────

interface Agenda {
  id: number;
  agenda: string;
  municipio: string;
  cotas: number;
  saldo: number;
  aguardando: number;
  indexRegula: number;
}

interface Encaminhamento {
  id: number;
  agendaId: number;
  agendaNome: string;
  municipio: string | null;
  reguladorEmail: string;
}

/**
 * Simula o JOIN por agendaNome + municipio (como feito no backend).
 * Retorna os dados atualizados da agenda para cada encaminhamento.
 */
function joinEncaminhamentosComAgendas(
  encaminhamentos: Encaminhamento[],
  agendas: Agenda[]
): (Encaminhamento & Partial<Agenda>)[] {
  return encaminhamentos.map(enc => {
    const agenda = agendas.find(a => {
      const nomeMatch = a.agenda === enc.agendaNome;
      // Se municipio é null no encaminhamento, aceita qualquer município (legado)
      const municipioMatch =
        enc.municipio === null || a.municipio === enc.municipio;
      return nomeMatch && municipioMatch;
    });
    return { ...enc, ...agenda };
  });
}

// ─── Dados de teste ──────────────────────────────────────────────────────────

const agendasSimuladas: Agenda[] = [
  {
    id: 101,
    agenda: "Ortopedia Joelho",
    municipio: "Porto Alegre",
    cotas: 50,
    saldo: 10,
    aguardando: 200,
    indexRegula: 4.0,
  },
  {
    id: 102,
    agenda: "Ortopedia Joelho",
    municipio: "Parobé",
    cotas: 30,
    saldo: 5,
    aguardando: 120,
    indexRegula: 4.0,
  },
  {
    id: 103,
    agenda: "Cardiologia",
    municipio: "Porto Alegre",
    cotas: 40,
    saldo: 8,
    aguardando: 90,
    indexRegula: 2.25,
  },
];

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("JOIN por agendaNome + municipio", () => {
  it("deve associar encaminhamento à agenda correta quando há agendas com mesmo nome em municípios diferentes", () => {
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 1,
        agendaId: 999, // ID antigo (antes da sincronização)
        agendaNome: "Ortopedia Joelho",
        municipio: "Porto Alegre",
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].municipio).toBe("Porto Alegre");
    expect(resultado[0].cotas).toBe(50); // dados de Porto Alegre, não de Parobé
    expect(resultado[0].aguardando).toBe(200);
  });

  it("deve associar encaminhamento à agenda de Parobé quando o município é Parobé", () => {
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 2,
        agendaId: 998,
        agendaNome: "Ortopedia Joelho",
        municipio: "Parobé",
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].municipio).toBe("Parobé");
    expect(resultado[0].cotas).toBe(30); // dados de Parobé, não de Porto Alegre
    expect(resultado[0].aguardando).toBe(120);
  });

  it("deve retornar dados atualizados após sincronização (IDs regenerados)", () => {
    // Simula situação pós-sincronização: IDs mudaram, mas nome+município são estáveis
    const encaminhamentosAntigos: Encaminhamento[] = [
      {
        id: 1,
        agendaId: 50, // ID antigo, não existe mais
        agendaNome: "Cardiologia",
        municipio: "Porto Alegre",
        reguladorEmail: "reg@example.com",
      },
    ];

    // Após sincronização, o ID da Cardiologia mudou para 103
    const resultado = joinEncaminhamentosComAgendas(encaminhamentosAntigos, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    // Dados atualizados da agenda (não do encaminhamento antigo)
    expect(resultado[0].id).toBe(103); // novo ID após sincronização
    expect(resultado[0].cotas).toBe(40);
    expect(resultado[0].indexRegula).toBe(2.25);
  });

  it("deve aceitar encaminhamentos legados sem município (municipio = null)", () => {
    // Encaminhamentos criados antes da coluna municipio ser adicionada
    const encaminhamentosLegados: Encaminhamento[] = [
      {
        id: 3,
        agendaId: 999,
        agendaNome: "Cardiologia",
        municipio: null, // legado: sem município
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentosLegados, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    // Deve encontrar a Cardiologia (único município disponível)
    expect(resultado[0].cotas).toBe(40);
  });

  it("deve retornar encaminhamento sem dados de agenda quando não há correspondência", () => {
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 4,
        agendaId: 999,
        agendaNome: "Especialidade Inexistente",
        municipio: "Porto Alegre",
        reguladorEmail: "reg@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    expect(resultado).toHaveLength(1);
    // Sem correspondência: dados da agenda são undefined (como no LEFT JOIN do SQL)
    expect(resultado[0].cotas).toBeUndefined();
  });

  it("não deve confundir agendas com mesmo nome em municípios diferentes ao fazer JOIN", () => {
    const encaminhamentos: Encaminhamento[] = [
      {
        id: 5,
        agendaId: 999,
        agendaNome: "Ortopedia Joelho",
        municipio: "Porto Alegre",
        reguladorEmail: "reg1@example.com",
      },
      {
        id: 6,
        agendaId: 998,
        agendaNome: "Ortopedia Joelho",
        municipio: "Parobé",
        reguladorEmail: "reg2@example.com",
      },
    ];

    const resultado = joinEncaminhamentosComAgendas(encaminhamentos, agendasSimuladas);

    expect(resultado).toHaveLength(2);
    // Cada encaminhamento deve ter os dados do seu município correto
    const poa = resultado.find(r => r.reguladorEmail === "reg1@example.com");
    const parobe = resultado.find(r => r.reguladorEmail === "reg2@example.com");

    expect(poa?.cotas).toBe(50);
    expect(poa?.aguardando).toBe(200);
    expect(parobe?.cotas).toBe(30);
    expect(parobe?.aguardando).toBe(120);
  });
});
