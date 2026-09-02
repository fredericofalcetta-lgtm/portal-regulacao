/**
 * TestePlataformaBackend.tsx
 * ---------------------------
 * Aba "Teste Plataforma Backend" — visível apenas para administradores.
 * Console de consulta somente-leitura (SELECT) ao PostgreSQL do
 * "plataforma-backend" (host 143.54.31.135), usado para descobrir a
 * estrutura real das tabelas e comparar com o que já está em
 * condutas_gercon, antes de decidir se vale integrar esse banco ao fluxo
 * de sincronização automática.
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { Database, Play, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const CONSULTAS_PRONTAS: { label: string; sql: string }[] = [
  {
    label: 'Listar tabelas do schema public',
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
  },
  {
    label: 'Colunas de uma tabela (troque nome_da_tabela)',
    sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nome_da_tabela' ORDER BY ordinal_position;",
  },
];

export default function TestePlataformaBackend() {
  const { regulador, perfilAtivo } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  const isAdmin = perfilNorm.includes('administrador');

  const [sql, setSql] = useState(CONSULTAS_PRONTAS[0].sql);

  const testarQueryMutation = trpc.plataformaBackend.testarQuery.useMutation();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    );
  }

  const resultado = testarQueryMutation.data;
  const erro = testarQueryMutation.error;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database size={22} className="text-primary" />
          Teste Plataforma Backend
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Console de consulta somente-leitura ao PostgreSQL <code className="bg-muted px-1 rounded">plataforma_backend</code> (143.54.31.135).
          Use para descobrir tabelas/colunas e comparar com <code className="bg-muted px-1 rounded">condutas_gercon</code> antes de integrar ao sync automático.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CONSULTAS_PRONTAS.map(c => (
          <Button key={c.label} variant="outline" size="sm" onClick={() => setSql(c.sql)}>
            {c.label}
          </Button>
        ))}
      </div>

      <Textarea
        value={sql}
        onChange={e => setSql(e.target.value)}
        rows={6}
        className="font-mono text-sm"
        placeholder="SELECT ..."
      />

      <div className="flex items-center gap-2">
        <Button
          onClick={() => testarQueryMutation.mutate({ sql })}
          disabled={testarQueryMutation.isPending || !sql.trim()}
        >
          <Play size={14} />
          {testarQueryMutation.isPending ? 'Executando...' : 'Executar'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Apenas SELECT/WITH são aceitos. Timeout de 20s.
        </span>
      </div>

      {erro && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{erro.message}</span>
        </div>
      )}

      {resultado && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{resultado.rowCount} linha(s) retornada(s)</p>
          <div className="overflow-auto border border-border rounded-lg max-h-[60vh]">
            <table className="min-w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {resultado.fields.map(f => (
                    <th key={f} className="text-left px-3 py-2 font-semibold whitespace-nowrap border-b border-border">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.rows.map((row, i) => (
                  <tr key={i} className="odd:bg-background even:bg-muted/30">
                    {resultado.fields.map(f => (
                      <td key={f} className="px-3 py-2 align-top border-b border-border/50 max-w-[320px] truncate" title={String(row[f] ?? '')}>
                        {row[f] === null ? <span className="text-muted-foreground italic">null</span> : String(row[f])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
