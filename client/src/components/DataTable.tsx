import { memo, useMemo, useCallback, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import EncaminharCell from './EncaminharCell';
import EncaminharGrupoCell from './EncaminharGrupoCell';
import AutoEncaminharCell from './AutoEncaminharCell';
import AutoEncaminharGrupoCell from './AutoEncaminharGrupoCell';
import CheckInCell from './CheckInCell';
import { getCorRowStyle, getCorBadgeStyle, getCorPrioridade } from '@/lib/corAgenda';
import { UltimaAtualizacao } from '@/components/UltimaAtualizacao';

interface DataTableProps {
  headers: string[];
  rows: (string | number)[][];
  selectedAgendas: Set<string>;
  selectedCentrais: Set<string>;
  selectedMunicipios?: Set<string>;
  selectedEspecialidades: Set<string>;
  selectedCores?: Set<string>;
  sortColumn: number;
  sortOrder: 'asc' | 'desc';
  onSort: (column: number) => void;
  perfilUsuario: string;
  emailUsuario: string;
  concluidasIds?: number[];
  onConcluir?: () => void;
  onRefresh?: () => void;
  dataUpdatedAt?: number;
}

// Layout: [0]agenda [1]municipio [2]cotas [3]saldo [4]aguardando
// [5]autorizadas [6]autCotas [7]indexRegula [8]>7d [9]>28d [10]>90d
// [11]central [12]especialidade [13]flagIndex [14]corIndex [15]flagAutCotas [16]corAutCotas [17]id

interface Grupo {
  nome: string;
  central: string;
  linhas: (string | number)[][];
}

// ─── Linha individual ─────────────────────────────────────────────────────────
const TableRow = memo(function TableRow({
  row, isAdminOuMonitor, isRegulador, encaminhadosAtuais = [], checkInsAtuais = [],
  reguladoresList = [], emailUsuario, onUpdate, isConcluida, isSubRow = false,
}: {
  row: (string | number)[];
  isAdminOuMonitor: boolean;
  isRegulador: boolean;
  encaminhadosAtuais: { reguladorEmail: string; reguladorNome: string }[];
  checkInsAtuais: { usuarioEmail: string; usuarioNome: string }[];
  reguladoresList: { email: string; nome: string }[];
  emailUsuario: string;
  onUpdate: () => void;
  isConcluida: boolean;
  isSubRow?: boolean;
}) {
  const agendaId = typeof row[17] === 'number' ? row[17] : 0;
  const cor = String(row[14] ?? '');
  const flagIndex = String(row[13] ?? '');
  const flagAutCotas = String(row[15] ?? '');
  const corAutCotas = String(row[16] ?? '');
  const indexValue = parseFloat(String(row[7])) || 0;

  const getIndexColor = (v: number) => {
    if (v > 3) return 'bg-red-100 dark:bg-red-950/50 text-red-900 dark:text-red-300';
    if (v > 2) return 'bg-orange-100 dark:bg-orange-950/50 text-orange-900 dark:text-orange-300';
    if (v > 1) return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-900 dark:text-yellow-300';
    return '';
  };

  const corRowStyle = getCorRowStyle(cor);
  const corBadgeStyle = getCorBadgeStyle(cor);

  return (
    <tr className={`border-b border-border hover:bg-secondary transition-colors ${isSubRow ? 'bg-muted/30 dark:bg-muted/10' : ''} ${isConcluida ? 'opacity-60 bg-emerald-50 dark:bg-emerald-950/20' : ''}`}
      style={isConcluida || isSubRow ? undefined : corRowStyle}>
      <td className={`py-1.5 text-foreground ${isSubRow ? 'pl-8 pr-2' : 'px-3'}`}>
        {isSubRow ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
            <div className="text-xs text-foreground font-medium">{String(row[0])}</div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {cor && !isConcluida && <span style={corBadgeStyle} title={cor} />}
            {isConcluida && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Concluída
              </span>
            )}
            <span className="font-medium text-xs text-foreground">{String(row[0])}</span>
          </div>
        )}
      </td>
      <td className="px-2 py-1.5 text-xs text-muted-foreground">{isSubRow ? String(row[1]) : '—'}</td>
      <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{String(row[11])}</td>
      {(isAdminOuMonitor || isRegulador) && (
        <td className="px-2 py-1.5 text-center">
          {isConcluida ? <span className="text-xs text-muted-foreground italic">bloqueado</span>
          : agendaId > 0 ? (
            isAdminOuMonitor ? (
              <EncaminharCell agendaId={agendaId} agendaNome={String(row[0])}
                municipio={row[1] != null && String(row[1]) !== '' ? String(row[1]) : undefined}
                central={row[11] != null && String(row[11]) !== '' ? String(row[11]) : undefined}
                especialidade={String(row[12])}
                encaminhadosAtuais={encaminhadosAtuais} reguladoresList={reguladoresList} onUpdate={onUpdate} />
            ) : (
              <AutoEncaminharCell agendaId={agendaId} agendaNome={String(row[0])}
                municipio={row[1] != null && String(row[1]) !== '' ? String(row[1]) : undefined}
                central={row[11] != null && String(row[11]) !== '' ? String(row[11]) : undefined}
                especialidade={String(row[12])} emailUsuario={emailUsuario}
                encaminhadosAtuais={encaminhadosAtuais} onUpdate={onUpdate} />
            )
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </td>
      )}
      <td className="px-2 py-1.5 text-center">
        {(checkInsAtuais ?? []).length > 0 ? (
          <div className="flex flex-col gap-1 items-center">
            {(checkInsAtuais ?? []).map(ci => (
              <span key={ci.usuarioEmail} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                {ci.usuarioNome || ci.usuarioEmail}
              </span>
            ))}
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{String(row[2])}</td>
      <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{String(row[3])}</td>
      <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{String(row[4])}</td>
      <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{String(row[5])}</td>
      <td className="px-2 py-1.5 text-center">
        <span title={flagAutCotas || undefined} className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold cursor-default ${corAutCotas === 'Vermelho' ? 'bg-red-100 dark:bg-red-950/50 text-red-900 dark:text-red-300' : corAutCotas === 'Laranja' ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-900 dark:text-orange-300' : corAutCotas === 'Amarelo' ? 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-900 dark:text-yellow-300' : corAutCotas === 'Verde' ? 'bg-green-100 dark:bg-green-950/50 text-green-900 dark:text-green-300' : 'text-foreground'}`}>
          {(() => { const raw = String(row[6] ?? ''); const v = parseFloat(raw.replace(/\./g, '').replace(',', '.')); return isNaN(v) ? (raw || '—') : v.toFixed(2); })()}
        </span>
      </td>
      <td className="px-2 py-1.5 text-center">
        <span title={flagIndex || undefined} className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold cursor-default ${getIndexColor(indexValue) || 'text-foreground'}`}>
          {indexValue.toFixed(2)}
        </span>
      </td>
      <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{row[8] ? String(row[8]) : '—'}</td>
      <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{row[9] ? String(row[9]) : '—'}</td>
      <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{row[10] ? String(row[10]) : '—'}</td>
    </tr>
  );
});

// ─── Linha de grupo ───────────────────────────────────────────────────────────
const GrupoRow = memo(function GrupoRow({
  grupo, isExpanded, onToggle, isAdminOuMonitor, isRegulador,
  encaminhamentosPorAgenda = new Map(), checkInsPorAgenda = new Map(), reguladoresList = [],
  emailUsuario, onUpdate, concluidasSet,
}: {
  grupo: Grupo;
  isExpanded: boolean;
  onToggle: () => void;
  isAdminOuMonitor: boolean;
  isRegulador: boolean;
  encaminhamentosPorAgenda: Map<number, { reguladorEmail: string; reguladorNome: string }[]>;
  checkInsPorAgenda: Map<number, { usuarioEmail: string; usuarioNome: string }[]>;
  reguladoresList: { email: string; nome: string }[];
  emailUsuario: string;
  onUpdate: () => void;
  concluidasSet: Set<number>;
}) {
  const { linhas, nome, central } = grupo;
  const isSingle = linhas.length === 1;

  const totais = useMemo(() => {
    const soma = (idx: number) => linhas.reduce((acc, r) => acc + (parseFloat(String(r[idx])) || 0), 0);
    return { cotas: soma(2), saldo: soma(3), aguardando: soma(4), autorizadas: soma(5), ag7d: soma(8), ag28d: soma(9), ag90d: soma(10) };
  }, [linhas]);

  const corDominante = useMemo(() =>
    linhas.reduce((melhor, r) => {
      const cor = String(r[14] ?? '');
      return getCorPrioridade(cor) < getCorPrioridade(melhor) ? cor : melhor;
    }, String(linhas[0][14] ?? '')), [linhas]);

  const checkInsGrupo = useMemo(() => {
    const vistos = new Set<string>();
    const lista: { usuarioEmail: string; usuarioNome: string }[] = [];
    for (const r of linhas) {
      const id = typeof r[17] === 'number' ? r[17] : 0;
      for (const ci of checkInsPorAgenda.get(id) ?? []) {
        if (!vistos.has(ci.usuarioEmail)) { vistos.add(ci.usuarioEmail); lista.push(ci); }
      }
    }
    return lista;
  }, [linhas, checkInsPorAgenda]);

  const encaminhadosGrupo = useMemo(() => {
    const vistos = new Set<string>();
    const lista: { reguladorEmail: string; reguladorNome: string }[] = [];
    for (const r of linhas) {
      const id = typeof r[17] === 'number' ? r[17] : 0;
      for (const e of encaminhamentosPorAgenda.get(id) ?? []) {
        if (!vistos.has(e.reguladorEmail)) { vistos.add(e.reguladorEmail); lista.push(e); }
      }
    }
    return lista;
  }, [linhas, encaminhamentosPorAgenda]);

  const corRowStyle = getCorRowStyle(corDominante);
  const corBadgeStyle = getCorBadgeStyle(corDominante);
  const todasConcluidas = linhas.every(r => { const id = typeof r[17] === 'number' ? r[17] : 0; return id > 0 && concluidasSet.has(id); });

  const municipioLabel = isSingle ? String(linhas[0][1]) : `${linhas.length} municípios`;

  return (
    <>
      <tr className={`border-b border-border transition-colors ${todasConcluidas ? 'opacity-60 bg-emerald-50 dark:bg-emerald-950/20' : isExpanded ? 'bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30' : 'bg-card hover:bg-secondary'}`}
        style={todasConcluidas || isExpanded ? undefined : corRowStyle}>
        <td className="px-3 py-1.5 text-foreground">
          <div className="flex items-center gap-2">
            {!isSingle ? (
              <button type="button" onClick={onToggle}
                className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
                title={isExpanded ? 'Recolher municípios' : 'Expandir municípios'}>
                <ChevronRight size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : <div className="w-5 flex-shrink-0" />}
            {corDominante && !todasConcluidas && <span style={corBadgeStyle} title={corDominante} />}
            {todasConcluidas && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Concluída
              </span>
            )}
            <div>
              <div className="font-medium text-xs text-foreground">{nome}</div>
            </div>
          </div>
        </td>
        <td className="px-2 py-1.5 text-xs text-muted-foreground">
          {isSingle ? municipioLabel : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">{linhas.length} municípios</span>
          )}
        </td>
        <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{central}</td>
        {(isAdminOuMonitor || isRegulador) && (
          <td className="px-2 py-1.5 text-center">
            {todasConcluidas ? (
              <span className="text-xs text-muted-foreground italic">bloqueado</span>
            ) : isAdminOuMonitor ? (
              <EncaminharGrupoCell linhas={linhas} encaminhadosGrupo={encaminhadosGrupo} reguladoresList={reguladoresList} onUpdate={onUpdate} />
            ) : (
              <AutoEncaminharGrupoCell
                linhas={linhas}
                emailUsuario={emailUsuario}
                encaminhamentosPorAgenda={encaminhamentosPorAgenda}
                onUpdate={onUpdate}
                concluidasSet={concluidasSet}
              />
            )}
          </td>
        )}
        <td className="px-2 py-1.5 text-center">
          {checkInsGrupo.length > 0 ? (
            <div className="flex flex-col gap-1 items-center">
              {checkInsGrupo.map(ci => (
                <span key={ci.usuarioEmail} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                  <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                  {ci.usuarioNome || ci.usuarioEmail}
                </span>
              ))}
            </div>
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{totais.cotas || '—'}</td>
        <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{totais.saldo || '—'}</td>
        <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{totais.aguardando || '—'}</td>
        <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{totais.autorizadas || '—'}</td>
        <td className="px-2 py-1.5 text-center">
          {isSingle ? (
            <span className="text-sm font-semibold text-foreground">
              {(() => { const raw = String(linhas[0][6] ?? ''); const v = parseFloat(raw.replace(/\./g, '').replace(',', '.')); return isNaN(v) ? (raw || '—') : v.toFixed(2); })()}
            </span>
          ) : <span className="text-sm text-muted-foreground">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center">
          {isSingle ? (
            <span className="text-sm font-semibold text-foreground">
              {(() => { const v = parseFloat(String(linhas[0][7] ?? 0)); return isNaN(v) ? '—' : v.toFixed(2); })()}
            </span>
          ) : <span className="text-sm text-muted-foreground">—</span>}
        </td>
        <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{totais.ag7d || '—'}</td>
        <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{totais.ag28d || '—'}</td>
        <td className="px-2 py-1.5 text-center text-xs font-medium text-foreground">{totais.ag90d || '—'}</td>
      </tr>
      {isExpanded && !isSingle && (linhas ?? []).map(row => {
        if (!row || !Array.isArray(row)) return null;
        const agendaId = typeof row[17] === 'number' ? row[17] : 0;
        const isConcluida = agendaId > 0 && concluidasSet.has(agendaId);
        return (
          <TableRow key={agendaId > 0 ? agendaId : String(row[1])} row={row}
            isAdminOuMonitor={isAdminOuMonitor} isRegulador={isRegulador}
            encaminhadosAtuais={encaminhamentosPorAgenda.get(agendaId) ?? []}
            checkInsAtuais={checkInsPorAgenda.get(agendaId) ?? []}
            reguladoresList={reguladoresList ?? []} emailUsuario={emailUsuario}
            onUpdate={onUpdate} isConcluida={isConcluida} isSubRow />
        );
      })}
    </>
  );
});

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DataTable({
  headers, rows, selectedAgendas, selectedCentrais, selectedEspecialidades, selectedCores = new Set(),
  selectedMunicipios = new Set(),
  sortColumn, sortOrder, onSort, perfilUsuario, emailUsuario,
  concluidasIds = [], onConcluir, onRefresh, dataUpdatedAt,
}: DataTableProps) {
  const concluidasSet = useMemo(() => new Set(concluidasIds), [concluidasIds]);
  const perfilLower = perfilUsuario.toLowerCase();
  const isAdminOuMonitor = perfilLower.includes('administrador') || perfilLower.includes('monitoramento');
  const isRegulador = perfilLower.includes('regulador');

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const toggleGrupo = useCallback((chave: string) => {
    setExpandidos(prev => { const next = new Set(prev); if (next.has(chave)) next.delete(chave); else next.add(chave); return next; });
  }, []);

  const { data: reguladoresList = [] } = trpc.reguladores.listarReguladores.useQuery(undefined, { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 });
  const { data: encaminhamentosData = [], refetch: refetchEncaminhamentos } = trpc.encaminhamentos.getAll.useQuery(undefined, { staleTime: 30 * 1000 });
  const { data: checkInsData = [], refetch: refetchCheckIns } = trpc.checkIns.getAll.useQuery(undefined, { staleTime: 30 * 1000 });

  const encaminhamentosPorAgenda = useMemo(() => {
    const map = new Map<number, { reguladorEmail: string; reguladorNome: string }[]>();
    for (const enc of encaminhamentosData) { const list = map.get(enc.agendaId) ?? []; list.push({ reguladorEmail: enc.reguladorEmail, reguladorNome: enc.reguladorNome }); map.set(enc.agendaId, list); }
    return map;
  }, [encaminhamentosData]);

  const checkInsPorAgenda = useMemo(() => {
    const map = new Map<number, { usuarioEmail: string; usuarioNome: string }[]>();
    for (const ci of checkInsData) { const list = map.get(ci.agendaId) ?? []; list.push({ usuarioEmail: ci.usuarioEmail, usuarioNome: ci.usuarioNome }); map.set(ci.agendaId, list); }
    return map;
  }, [checkInsData]);

  const handleUpdate = useCallback(() => { refetchEncaminhamentos(); refetchCheckIns(); onConcluir?.(); }, [refetchEncaminhamentos, refetchCheckIns, onConcluir]);

  const expandirEspecialidades = (valor: string) => valor.split(/[,;]/).map(e => e.trim()).filter(Boolean);

  const filteredRows = useMemo(() => rows.filter(row => {
    const agenda = String(row[0]), central = String(row[11]), espBruta = String(row[12]);
    const municipio = String(row[1]);
    const matchesAgenda = selectedAgendas.size === 0 || selectedAgendas.has(agenda);
    const matchesCentral = selectedCentrais.size === 0 || selectedCentrais.has(central);
    const matchesMunicipio = selectedMunicipios.size === 0 || selectedMunicipios.has(municipio);
    const partes = expandirEspecialidades(espBruta);
    const matchesEsp = selectedEspecialidades.size === 0 || partes.some(p => selectedEspecialidades.has(p));
    const cor = String(row[14] ?? '');
    const matchesCor = selectedCores.size === 0 || selectedCores.has(cor) || (selectedCores.has('Sem cor') && !cor);
    return matchesAgenda && matchesCentral && matchesMunicipio && matchesEsp && matchesCor;
  }), [rows, selectedAgendas, selectedCentrais, selectedMunicipios, selectedEspecialidades, selectedCores]);

  const grupos = useMemo((): Grupo[] => {
    const mapa = new Map<string, Grupo>();
    for (const row of filteredRows) {
      const nome = String(row[0]), central = String(row[11]), chave = `${nome}|${central}`;
      if (!mapa.has(chave)) mapa.set(chave, { nome, central, linhas: [] });
      mapa.get(chave)!.linhas.push(row);
    }
    const lista = Array.from(mapa.values());
    lista.sort((a, b) => {
      const getVal = (g: Grupo): number | string => {
        if (sortColumn === 14) return Math.min(...g.linhas.map(r => getCorPrioridade(String(r[14] ?? ''))));
        const numCols = [2, 3, 4, 5, 7, 8, 9, 10];
        if (numCols.includes(sortColumn)) return g.linhas.reduce((s, r) => s + (parseFloat(String(r[sortColumn])) || 0), 0);
        if (sortColumn === 6) { const raw = String(g.linhas[0][6] ?? ''); return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0; }
        return String(g.linhas[0][sortColumn]);
      };
      const aVal = getVal(a), bVal = getVal(b);
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      // Ordenação especial para Central (col 11) — segue ordem CRA, 1CRS, 2CRS...
      if (sortColumn === 11) {
        const ORDEM_CENTRAL = ['CRA','1CRS','2CRS','3CRS','4CRS','5CRS','6CRS','7CRS','8CRS','9CRS','10CRS','11CRS','12CRS','13CRS','14CRS','15CRS','16CRS','17CRS','18CRS'];
        const ia = ORDEM_CENTRAL.indexOf(String(aVal));
        const ib = ORDEM_CENTRAL.indexOf(String(bVal));
        const posA = ia === -1 ? 999 : ia;
        const posB = ib === -1 ? 999 : ib;
        return sortOrder === 'desc' ? posB - posA : posA - posB;
      }
      return sortOrder === 'desc' ? String(bVal).localeCompare(String(aVal), 'pt-BR') : String(aVal).localeCompare(String(bVal), 'pt-BR');
    });
    return lista;
  }, [filteredRows, sortColumn, sortOrder]);

  const SortIcon = ({ col }: { col: number }) =>
    sortColumn === col ? (sortOrder === 'desc' ? <ChevronDown size={16} className="text-primary" /> : <ChevronUp size={16} className="text-primary" />) : null;

  const numCols = (isAdminOuMonitor || isRegulador) ? 13 : 12;

  return (
    <div className="flex-1 flex flex-col bg-card">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground">Lista de agendas</h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-muted-foreground">
            {grupos.length} agenda{grupos.length !== 1 ? 's' : ''}
            {grupos.length !== filteredRows.length && <span className="ml-1 text-muted-foreground/70">· {filteredRows.length} linha{filteredRows.length !== 1 ? 's' : ''} no total</span>}
          </p>
          <UltimaAtualizacao compact />
        </div>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-secondary z-10">
            <tr>
              <th onClick={() => onSort(0)} className="px-3 py-1.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors">
                <div className="flex items-center space-x-1"><span>Agenda</span><SortIcon col={0} /></div>
              </th>
              <th onClick={() => onSort(1)} className="px-2 py-1.5 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors">
                <div className="flex items-center space-x-1"><span>Município</span><SortIcon col={1} /></div>
              </th>
              <th onClick={() => onSort(11)} className="px-2 py-1.5 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors">
                <div className="flex items-center justify-center space-x-1"><span>Central</span><SortIcon col={11} /></div>
              </th>
              {(isAdminOuMonitor || isRegulador) && <th className="px-2 py-1.5 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Encaminhar</th>}
              <th className="px-2 py-1.5 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">Regulando</th>
              {[{label:'Cotas',col:2},{label:'Saldo',col:3},{label:'Aguardando',col:4},{label:'Autorizadas',col:5},{label:'Fila/Cotas',col:6},{label:'Index',col:7},{label:'>7d',col:8},{label:'>28d',col:9},{label:'>90d',col:10}].map(({label,col}) => (
                <th key={col} onClick={() => onSort(col)} className="px-2 py-1.5 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border cursor-pointer hover:bg-muted transition-colors">
                  <div className="flex items-center justify-center space-x-1"><span>{label}</span><SortIcon col={col} /></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 ? (
              <tr><td colSpan={numCols} className="px-6 py-8 text-center"><p className="text-muted-foreground">Nenhum resultado encontrado</p></td></tr>
            ) : grupos.map(grupo => {
              const chave = `${grupo.nome}|${grupo.central}`;
              return (
                <GrupoRow key={chave} grupo={grupo} isExpanded={expandidos.has(chave)} onToggle={() => toggleGrupo(chave)}
                  isAdminOuMonitor={isAdminOuMonitor} isRegulador={isRegulador}
                  encaminhamentosPorAgenda={encaminhamentosPorAgenda} checkInsPorAgenda={checkInsPorAgenda}
                  reguladoresList={reguladoresList} emailUsuario={emailUsuario}
                  onUpdate={handleUpdate} concluidasSet={concluidasSet} />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
