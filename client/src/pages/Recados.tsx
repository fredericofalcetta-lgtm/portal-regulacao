/**
 * Recados.tsx — página exclusiva para administradores.
 * Permite enviar recados para toda a equipe e ver o histórico.
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRegulador } from '@/contexts/ReguladorContext';
import { Send, Bell, BellOff, Clock, User } from 'lucide-react';

function formatarData(d: Date | string) {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Recados() {
  const { regulador, perfilAtivo } = useRegulador();
  const perfilNorm = (perfilAtivo ?? regulador?.perfil ?? '').toLowerCase();
  const isAdmin = perfilNorm.includes('administrador');

  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const { data: historico = [], refetch } = trpc.recados.listar.useQuery(undefined, {
    enabled: isAdmin,
  });

  const criarMutation = trpc.recados.criar.useMutation({
    onSuccess: () => {
      setFeedback({ tipo: 'ok', texto: 'Recado enviado com sucesso!' });
      setTitulo('');
      setMensagem('');
      refetch();
    },
    onError: (e) => setFeedback({ tipo: 'erro', texto: e.message }),
  });

  const desativarMutation = trpc.recados.desativar.useMutation({
    onSuccess: () => refetch(),
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Bell size={20} className="text-primary" />
        <h1 className="text-lg font-semibold text-foreground">Recados para a equipe</h1>
      </div>

      {/* Formulário de novo recado */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Novo recado</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Título</label>
          <input
            type="text"
            value={titulo}
            onChange={e => { setTitulo(e.target.value); setFeedback(null); }}
            placeholder="Ex: Atualização no sistema, Aviso importante..."
            className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem</label>
          <textarea
            value={mensagem}
            onChange={e => { setMensagem(e.target.value); setFeedback(null); }}
            placeholder="Digite o recado para toda a equipe..."
            rows={4}
            className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {feedback && (
          <p className={`text-xs ${feedback.tipo === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {feedback.texto}
          </p>
        )}

        <button
          onClick={() => { if (titulo.trim() && mensagem.trim()) criarMutation.mutate({ titulo: titulo.trim(), mensagem: mensagem.trim() }); }}
          disabled={!titulo.trim() || !mensagem.trim() || criarMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send size={14} />
          {criarMutation.isPending ? 'Enviando...' : 'Enviar recado'}
        </button>
      </div>

      {/* Histórico */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Histórico de recados</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum recado enviado ainda.</p>
        ) : (
          historico.map(r => (
            <div
              key={r.id}
              className={`rounded-xl border p-4 space-y-2 ${
                r.ativo ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {r.ativo
                      ? <Bell size={13} className="text-primary shrink-0" />
                      : <BellOff size={13} className="text-muted-foreground shrink-0" />}
                    <p className="text-sm font-semibold text-foreground">{r.titulo}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User size={10} />{r.autorNome ?? r.autorEmail}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{formatarData(r.criadoEm)}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      r.ativo
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {r.ativo ? 'Ativo' : 'Desativado'}
                    </span>
                  </div>
                </div>
                {r.ativo && (
                  <button
                    onClick={() => desativarMutation.mutate({ id: r.id })}
                    disabled={desativarMutation.isPending}
                    className="shrink-0 text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Desativar
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{r.mensagem}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
