import { useEffect, useMemo, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { toast } from 'sonner';
import { Search, X, Copy, Star, RefreshCw, BookOpen, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const FAVORITOS_KEY = 'condutas-gercon-favoritos';

function useIsAdmin() {
  const { regulador, perfilAtivo } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  return perfilNorm.includes('administrador');
}

function normalize(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function loadFavoritos(): Set<number> {
  try {
    const raw = localStorage.getItem(FAVORITOS_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function saveFavoritos(favoritos: Set<number>) {
  localStorage.setItem(FAVORITOS_KEY, JSON.stringify([...favoritos]));
}

async function copiarTexto(texto: string, mensagem: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(mensagem);
  } catch {
    toast.error('Não foi possível copiar. Selecione e copie manualmente.');
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Destaca (em <mark>) as ocorrências dos termos buscados dentro do texto. */
function highlightText(text: string, query: string): React.ReactNode {
  const tokens = normalize(query).split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return text;

  const pattern = new RegExp(`(${tokens.map(escapeRegex).join('|')})`, 'gi');
  const parts = text.split(pattern);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-amber-200 dark:bg-amber-500/40 text-inherit rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

const TRUNCATE_LENGTH = 320;

function formatarDataHora(iso: string | Date): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function CondutasGercon() {
  const isAdmin = useIsAdmin();
  const [busca, setBusca] = useState('');
  const [especialidade, setEspecialidade] = useState<string>('');
  const [somenteFavoritos, setSomenteFavoritos] = useState(false);
  const [favoritos, setFavoritos] = useState<Set<number>>(() => loadFavoritos());
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

  const { data: condutas, isLoading } = trpc.condutas.listar.useQuery(undefined, { enabled: isAdmin });
  const { data: ultimaSync } = trpc.condutas.ultimaSincronizacao.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();

  const sincronizarMutation = trpc.condutas.sincronizar.useMutation({
    onSuccess: (res) => {
      toast.success(`Sincronização concluída: ${res.count} condutas atualizadas.`);
      utils.condutas.listar.invalidate();
      utils.condutas.ultimaSincronizacao.invalidate();
    },
    onError: (err) => {
      toast.error(`Falha na sincronização: ${err.message}`);
    },
  });

  const importarCsvMutation = trpc.condutas.importarCsv.useMutation({
    onSuccess: (res) => {
      toast.success(`Importação concluída: ${res.count} condutas atualizadas.`);
      utils.condutas.listar.invalidate();
      utils.condutas.ultimaSincronizacao.invalidate();
    },
    onError: (err) => {
      toast.error(`Falha na importação do CSV: ${err.message}`);
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const csv = reader.result as string;
      importarCsvMutation.mutate({ csv });
    };
    reader.onerror = () => toast.error('Não foi possível ler o arquivo.');
    reader.readAsText(file, 'utf-8');
    // Permite selecionar o mesmo arquivo de novo em uma próxima tentativa
    e.target.value = '';
  };

  useEffect(() => {
    saveFavoritos(favoritos);
  }, [favoritos]);

  const especialidades = useMemo(() => {
    const set = new Set((condutas ?? []).map(c => c.especialidade).filter(Boolean) as string[]);
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [condutas]);

  const filtradas = useMemo(() => {
    const termo = normalize(busca);
    return (condutas ?? [])
      .filter(c => (especialidade ? c.especialidade === especialidade : true))
      .filter(c => (somenteFavoritos ? favoritos.has(c.id) : true))
      .filter(c => {
        if (!termo) return true;
        return normalize(
          [c.situacao, c.ciapCid, c.especialidade, c.conduta, c.referencias].join(' ')
        ).includes(termo);
      });
  }, [condutas, busca, especialidade, somenteFavoritos, favoritos]);

  const toggleFavorito = (id: number) => {
    setFavoritos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAberto = (id: number) => {
    setAbertos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExpandido = (id: number) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen size={24} className="text-primary" />
            Condutas GERCON
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Busque por situação clínica, CIAP/CID, especialidade ou texto da conduta para instruir consultorias.
          </p>
        </div>
        {isAdmin && (
          <div className="text-right">
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sincronizarMutation.mutate()}
                disabled={sincronizarMutation.isPending}
              >
                <RefreshCw size={14} className={sincronizarMutation.isPending ? 'animate-spin' : ''} />
                {sincronizarMutation.isPending ? 'Sincronizando...' : 'Sincronizar com Metabase'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importarCsvMutation.isPending}
              >
                <Upload size={14} className={importarCsvMutation.isPending ? 'animate-spin' : ''} />
                {importarCsvMutation.isPending ? 'Importando...' : 'Importar CSV'}
              </Button>
            </div>
            {ultimaSync && (
              <p className="text-xs text-muted-foreground mt-1">
                Última sincronização: {formatarDataHora(ultimaSync.syncedAt)} ({ultimaSync.rowCount} registros)
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b border-border">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar em todas as condutas..."
            className="pl-9 pr-9"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <Select value={especialidade || '__todas__'} onValueChange={v => setEspecialidade(v === '__todas__' ? '' : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todas as especialidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas__">Todas as especialidades</SelectItem>
            {especialidades.map(esp => (
              <SelectItem key={esp} value={esp}>{esp}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={somenteFavoritos ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSomenteFavoritos(v => !v)}
        >
          <Star size={14} className={somenteFavoritos ? 'fill-current' : ''} />
          Favoritos
        </Button>

        {(busca || especialidade || somenteFavoritos) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setBusca(''); setEspecialidade(''); setSomenteFavoritos(false); }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {isLoading ? 'Carregando...' : `${filtradas.length} resultado${filtradas.length === 1 ? '' : 's'}`}
      </p>

      <div className="space-y-3">
        {!isLoading && filtradas.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Nenhuma conduta encontrada. Tente outros termos ou limpe os filtros.
          </p>
        )}

        {filtradas.map(c => {
          const fav = favoritos.has(c.id);
          const aberto = abertos.has(c.id);
          const expandido = expandidos.has(c.id);
          const condutaLonga = c.conduta.length > TRUNCATE_LENGTH;
          const textoConduta =
            condutaLonga && !expandido ? c.conduta.slice(0, TRUNCATE_LENGTH).trimEnd() + '…' : c.conduta;
          return (
            <div
              key={c.id}
              className={`rounded-lg border bg-card p-4 shadow-sm ${fav ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-primary'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h3 className="font-semibold text-primary text-base leading-tight">
                    {highlightText(c.situacao, busca)}
                  </h3>
                  {c.ciapCid && (
                    <p className="text-xs italic text-muted-foreground mt-0.5">{c.ciapCid}</p>
                  )}
                </div>
                <Badge variant="secondary" className="whitespace-nowrap">{c.especialidade}</Badge>
              </div>

              <p className="text-sm text-card-foreground whitespace-pre-wrap mt-2">
                {highlightText(textoConduta, busca)}
              </p>
              {condutaLonga && (
                <button
                  onClick={() => toggleExpandido(c.id)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  {expandido ? 'Ver menos' : 'Ver conduta completa'}
                </button>
              )}

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copiarTexto(`${c.situacao}\n${c.ciapCid ?? ''}\n\n${c.conduta}`, 'Conduta copiada')}
                >
                  <Copy size={13} /> Copiar conduta
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleFavorito(c.id)}>
                  <Star size={13} className={fav ? 'fill-current text-amber-500' : ''} />
                  {fav ? 'Remover favorito' : 'Favoritar'}
                </Button>
                {c.referencias && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copiarTexto(c.referencias ?? '', 'Referências copiadas')}
                    >
                      <Copy size={13} /> Copiar referências
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleAberto(c.id)}>
                      {aberto ? 'Ocultar referências' : 'Ver referências'}
                    </Button>
                  </>
                )}
              </div>

              {aberto && c.referencias && (
                <div className="mt-2 pt-2 border-t border-dashed border-border text-xs text-muted-foreground whitespace-pre-wrap">
                  {c.referencias}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground pt-4">
        Material de apoio técnico. Confirme atualizações, contraindicações e aplicabilidade clínica antes do uso.
      </p>
    </div>
  );
}
