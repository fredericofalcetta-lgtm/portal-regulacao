import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, FileText, ListOrdered, ExternalLink, TrendingDown, ChevronsUpDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { getCorRowStyle, getCorBadgeStyle } from '@/lib/corAgenda';

interface CheckInDetalhesProps {
  agendaId: number;
  agendaNome?: string;
  especialidade: string;
  central?: string | null;
  municipio?: string | null;
}

export default function CheckInDetalhes({ agendaId, agendaNome, especialidade, central, municipio }: CheckInDetalhesProps) {
  const [expandido, setExpandido] = useState(false);
  type SortCol = 'agenda' | 'municipio' | 'cotas' | 'saldo' | 'aguardando' | 'autorizadas' | 'autCotas' | 'indexRegula';
  const [sortCol, setSortCol] = useState<SortCol>('indexRegula');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSortCol = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const { data: obsData } = trpc.agendaConfig.getObservacao.useQuery(
    { agendaNome: agendaNome ?? '', central: central ?? '' },
    { enabled: expandido && !!agendaNome && !!central }
  );

  const observacao = obsData?.observacao ?? '';

  const { data, isLoading } = trpc.checkIns.getRelacionadas.useQuery(
    {
      especialidade,
      central: central ?? undefined,
      municipio: municipio ?? undefined,
      agendaIdExcluir: agendaId,
      agendaNomeExcluir: agendaNome,
    },
    {
      enabled: expandido, // só busca quando o painel está aberto
    }
  );

  const agendasRaw = data?.agendas ?? [];
  const prioridadesList = data?.prioridades ?? [];
  const protocolosList = data?.protocolos ?? [];

  const agendas = [...agendasRaw].sort((a, b) => {
    const parseNum = (v: unknown) => {
      const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    let av: number | string, bv: number | string;
    if (sortCol === 'agenda') { av = a.agenda ?? ''; bv = b.agenda ?? ''; }
    else if (sortCol === 'municipio') { av = a.municipio ?? ''; bv = b.municipio ?? ''; }
    else if (sortCol === 'autCotas') { av = parseNum(a.autCotas); bv = parseNum(b.autCotas); }
    else { av = (a[sortCol] as number) ?? 0; bv = (b[sortCol] as number) ?? 0; }
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'desc' ? bv - av : av - bv;
    return sortDir === 'desc' ? String(bv).localeCompare(String(av), 'pt-BR') : String(av).localeCompare(String(bv), 'pt-BR');
  });

  const getIndexColor = (value: number | null | undefined): string => {
    if (!value) return 'text-muted-foreground';
    if (value > 3) return 'text-red-600 dark:text-red-400 font-bold';
    if (value > 2) return 'text-orange-600 dark:text-orange-400 font-semibold';
    if (value > 1) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  const getBgIndex = (value: number | null | undefined): string => {
    if (!value) return 'bg-muted/50';
    if (value > 3) return 'bg-red-50 dark:bg-red-950/30';
    if (value > 2) return 'bg-orange-50 dark:bg-orange-950/30';
    if (value > 1) return 'bg-yellow-50 dark:bg-yellow-950/30';
    return 'bg-muted/30';
  };

  return (
    <div className="border-t border-border/50">
      {/* Botão de expandir */}
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <TrendingDown size={12} />
          Ver agendas relacionadas · protocolo · lista de prioridades
        </span>
        {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Painel expandido */}
      {expandido && (
        <div className="px-4 pb-4 pt-1 bg-secondary/20 space-y-4">

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Carregando dados...</span>
            </div>
          ) : (
            <>
              {/* ── Recursos da especialidade ── */}
              {(prioridadesList.length > 0 || protocolosList.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {prioridadesList.map(p => (
                    <a
                      key={p.id}
                      href={p.linkUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                    >
                      <ListOrdered size={11} />
                      {p.nomeArquivo ?? 'Lista de Prioridades'}
                      <ExternalLink size={10} className="opacity-60" />
                    </a>
                  ))}
                  {protocolosList.map(p => (
                    <a
                      key={p.id}
                      href={p.linkUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800"
                    >
                      <FileText size={11} />
                      {p.nome}
                      <ExternalLink size={10} className="opacity-60" />
                    </a>
                  ))}
                </div>
              )}

              {prioridadesList.length === 0 && protocolosList.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum protocolo ou lista de prioridades cadastrado para esta especialidade.
                </p>
              )}

              {/* Observação específica da central */}
              {observacao && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <svg className="w-3.5 h-3.5 mt-0.5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-800 dark:text-amber-300">{observacao}</p>
                </div>
              )}

              {/* ── Agendas relacionadas ── */}
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingDown size={12} />
                  Agendas da mesma especialidade{central ? ` · ${central}` : ''} — ordenadas por índice
                </h4>

                {agendas.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma outra agenda encontrada com os mesmos critérios.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-secondary">
                        <tr>
                          {([
                            { label: 'Agenda', col: 'agenda' as SortCol },
                            { label: 'Município', col: 'municipio' as SortCol },
                            { label: 'Cotas', col: 'cotas' as SortCol },
                            { label: 'Saldo', col: 'saldo' as SortCol },
                            { label: 'Aguardando', col: 'aguardando' as SortCol },
                            { label: 'Autorizadas', col: 'autorizadas' as SortCol },
                            { label: 'Fila/Cotas', col: 'autCotas' as SortCol },
                            { label: 'Índice', col: 'indexRegula' as SortCol },
                          ]).map(({ label, col }) => (
                            <th
                              key={col}
                              onClick={() => handleSortCol(col)}
                              className={`px-3 py-2 font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors select-none ${col === 'agenda' || col === 'municipio' ? 'text-left' : 'text-center'}`}
                            >
                              <div className={`flex items-center gap-1 ${col === 'agenda' || col === 'municipio' ? '' : 'justify-center'}`}>
                                {label}
                                {sortCol === col
                                  ? sortDir === 'desc' ? <ChevronDown size={11} className="text-primary" /> : <ChevronUp size={11} className="text-primary" />
                                  : <ChevronsUpDown size={11} className="text-muted-foreground/50" />
                                }
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {agendas.map((a) => {
                          const corRowStyle = getCorRowStyle(a.corIndex);
                          const corBadgeStyle = getCorBadgeStyle(a.corIndex);
                          return (
                          <tr
                            key={a.id}
                            className={`border-t border-border/50 ${getBgIndex(a.indexRegula)} hover:opacity-90 transition-opacity`}
                            style={corRowStyle}
                          >
                            <td className="px-3 py-1.5 font-medium text-foreground">
                              <div className="flex items-center gap-1.5">
                                {a.corIndex && <span style={corBadgeStyle} title={a.corIndex} />}
                                {a.agenda ?? '—'}
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-center text-muted-foreground">{a.municipio ?? '—'}</td>
                            <td className="px-3 py-1.5 text-center text-foreground">{a.cotas ?? '—'}</td>
                            <td className="px-3 py-1.5 text-center text-foreground">{a.saldo ?? '—'}</td>
                            <td className="px-3 py-1.5 text-center text-foreground">{a.aguardando ?? '—'}</td>
                            <td className="px-3 py-1.5 text-center text-foreground">{a.autorizadas ?? '—'}</td>
                            <td className="px-3 py-1.5 text-center text-foreground">
                              {a.autCotas != null
                                ? (() => {
                                    // autCotas vem como string pt-BR (ex: "21,2") — converter antes de formatar
                                    const v = parseFloat(String(a.autCotas).replace(/\./g, '').replace(',', '.'));
                                    return isNaN(v) ? String(a.autCotas) : v.toFixed(2);
                                  })()
                                : '—'}
                            </td>
                            <td className={`px-3 py-1.5 text-center ${getIndexColor(a.indexRegula)}`}>
                              {a.indexRegula != null ? a.indexRegula.toFixed(2) : '—'}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
