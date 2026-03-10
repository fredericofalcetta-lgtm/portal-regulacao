import { describe, it, expect } from 'vitest';

// ─── Lógica de negócio isolada para testes ───────────────────────────────────

/**
 * Verifica se um perfil tem permissão para encaminhar agendas.
 * Apenas Administrador e Monitoramento podem encaminhar.
 */
function podeEncaminhar(perfil: string): boolean {
  const p = perfil.toLowerCase();
  return p === 'administrador' || p === 'monitoramento';
}

/**
 * Simula o toggle de check-in:
 * - Se já existe check-in do usuário na agenda, retorna 'checkout'
 * - Caso contrário, retorna 'checkin'
 */
function toggleCheckIn(
  checkInsExistentes: { agendaId: number; usuarioEmail: string }[],
  agendaId: number,
  usuarioEmail: string
): 'checkin' | 'checkout' {
  const jaExiste = checkInsExistentes.some(
    ci => ci.agendaId === agendaId && ci.usuarioEmail === usuarioEmail
  );
  return jaExiste ? 'checkout' : 'checkin';
}

/**
 * Simula a limpeza de check-ins de um usuário.
 */
function limparCheckIns(
  checkIns: { agendaId: number; usuarioEmail: string }[],
  usuarioEmail: string
): { agendaId: number; usuarioEmail: string }[] {
  return checkIns.filter(ci => ci.usuarioEmail !== usuarioEmail);
}

/**
 * Simula o encaminhamento: substitui encaminhamentos anteriores da agenda.
 */
function encaminhar(
  encaminhamentosExistentes: { agendaId: number; reguladorEmail: string }[],
  agendaId: number,
  novosReguladores: string[]
): { agendaId: number; reguladorEmail: string }[] {
  const semAgenda = encaminhamentosExistentes.filter(e => e.agendaId !== agendaId);
  const novos = novosReguladores.map(email => ({ agendaId, reguladorEmail: email }));
  return [...semAgenda, ...novos];
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('podeEncaminhar', () => {
  it('Administrador pode encaminhar', () => {
    expect(podeEncaminhar('Administrador')).toBe(true);
  });

  it('administrador (minúsculo) pode encaminhar', () => {
    expect(podeEncaminhar('administrador')).toBe(true);
  });

  it('Monitoramento pode encaminhar', () => {
    expect(podeEncaminhar('Monitoramento')).toBe(true);
  });

  it('MONITORAMENTO (maiúsculo) pode encaminhar', () => {
    expect(podeEncaminhar('MONITORAMENTO')).toBe(true);
  });

  it('Regulador NÃO pode encaminhar', () => {
    expect(podeEncaminhar('Regulador')).toBe(false);
  });

  it('Perfil vazio NÃO pode encaminhar', () => {
    expect(podeEncaminhar('')).toBe(false);
  });
});

describe('toggleCheckIn', () => {
  const checkIns = [
    { agendaId: 1, usuarioEmail: 'user@test.com' },
    { agendaId: 2, usuarioEmail: 'outro@test.com' },
  ];

  it('retorna checkin quando usuário não tem check-in na agenda', () => {
    expect(toggleCheckIn(checkIns, 3, 'user@test.com')).toBe('checkin');
  });

  it('retorna checkout quando usuário já tem check-in na agenda', () => {
    expect(toggleCheckIn(checkIns, 1, 'user@test.com')).toBe('checkout');
  });

  it('retorna checkin quando outro usuário tem check-in mas o atual não', () => {
    expect(toggleCheckIn(checkIns, 2, 'user@test.com')).toBe('checkin');
  });

  it('retorna checkin em lista vazia', () => {
    expect(toggleCheckIn([], 1, 'user@test.com')).toBe('checkin');
  });
});

describe('limparCheckIns', () => {
  const checkIns = [
    { agendaId: 1, usuarioEmail: 'user@test.com' },
    { agendaId: 2, usuarioEmail: 'user@test.com' },
    { agendaId: 1, usuarioEmail: 'outro@test.com' },
  ];

  it('remove todos os check-ins do usuário', () => {
    const resultado = limparCheckIns(checkIns, 'user@test.com');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].usuarioEmail).toBe('outro@test.com');
  });

  it('não remove check-ins de outros usuários', () => {
    const resultado = limparCheckIns(checkIns, 'user@test.com');
    expect(resultado.every(ci => ci.usuarioEmail !== 'user@test.com')).toBe(true);
  });

  it('retorna lista inalterada se usuário não tem check-ins', () => {
    const resultado = limparCheckIns(checkIns, 'nenhum@test.com');
    expect(resultado).toHaveLength(3);
  });

  it('retorna lista vazia se todos os check-ins são do usuário', () => {
    const soUser = checkIns.filter(ci => ci.usuarioEmail === 'user@test.com');
    const resultado = limparCheckIns(soUser, 'user@test.com');
    expect(resultado).toHaveLength(0);
  });
});

describe('encaminhar', () => {
  const existentes = [
    { agendaId: 1, reguladorEmail: 'reg1@test.com' },
    { agendaId: 1, reguladorEmail: 'reg2@test.com' },
    { agendaId: 2, reguladorEmail: 'reg3@test.com' },
  ];

  it('substitui encaminhamentos anteriores da agenda', () => {
    const resultado = encaminhar(existentes, 1, ['reg4@test.com']);
    const da1 = resultado.filter(e => e.agendaId === 1);
    expect(da1).toHaveLength(1);
    expect(da1[0].reguladorEmail).toBe('reg4@test.com');
  });

  it('mantém encaminhamentos de outras agendas', () => {
    const resultado = encaminhar(existentes, 1, ['reg4@test.com']);
    const da2 = resultado.filter(e => e.agendaId === 2);
    expect(da2).toHaveLength(1);
  });

  it('remove todos os encaminhamentos da agenda quando lista vazia', () => {
    const resultado = encaminhar(existentes, 1, []);
    const da1 = resultado.filter(e => e.agendaId === 1);
    expect(da1).toHaveLength(0);
  });

  it('encaminha para múltiplos reguladores', () => {
    const resultado = encaminhar(existentes, 1, ['reg4@test.com', 'reg5@test.com']);
    const da1 = resultado.filter(e => e.agendaId === 1);
    expect(da1).toHaveLength(2);
  });
});
