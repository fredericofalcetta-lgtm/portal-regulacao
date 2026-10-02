import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

/** Intervalo entre verificações (ms). */
const INTERVALO_MS = 2 * 60 * 1000;

/**
 * Envia um "sinal de vida" ao servidor a cada 2 minutos, MAS apenas se houve
 * interação real com o portal nesse intervalo (mouse, teclado, clique,
 * rolagem ou toque) e a aba estiver visível.
 *
 * Assim, uma aba esquecida aberta não conta como uso: após 30 min sem sinais,
 * o servidor encerra a sessão no horário da última atividade.
 */
export function useHeartbeat(enabled: boolean) {
  const heartbeat = trpc.auth.heartbeat.useMutation();
  const houveInteracao = useRef(false);
  const mutateRef = useRef(heartbeat.mutate);
  mutateRef.current = heartbeat.mutate;

  useEffect(() => {
    if (!enabled) return;

    const marcar = () => { houveInteracao.current = true; };
    const eventos: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    eventos.forEach(ev => window.addEventListener(ev, marcar, { passive: true, capture: true }));

    const enviarSeAtivo = () => {
      if (houveInteracao.current && document.visibilityState === 'visible') {
        houveInteracao.current = false;
        mutateRef.current();
      }
    };

    // Voltar para a aba do portal (ex.: vindo do GERCON) conta como atividade imediata
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        houveInteracao.current = true;
        enviarSeAtivo();
      }
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    const timer = window.setInterval(enviarSeAtivo, INTERVALO_MS);

    return () => {
      eventos.forEach(ev => window.removeEventListener(ev, marcar, { capture: true }));
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.clearInterval(timer);
    };
  }, [enabled]);
}
