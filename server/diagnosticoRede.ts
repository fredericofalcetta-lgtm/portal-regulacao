import net from "net";

/**
 * Equivalente a `nc -zv host port`, rodado de DENTRO do servidor (Railway) —
 * abre e imediatamente fecha uma conexão TCP crua, sem falar nenhum
 * protocolo de aplicação (Postgres, HTTP, etc.). Útil para diferenciar
 * "bloqueio de rede/firewall" (timeout, connection refused) de
 * "credencial errada" (nesse caso o TCP conecta normalmente, o erro
 * aconteceria só depois, na autenticação do protocolo específico).
 */
export interface TesteTcpResult {
  host: string;
  port: number;
  sucesso: boolean;
  tempoMs: number;
  erro?: string;
}

export async function testarConectividadeTcp(
  host: string,
  port: number,
  timeoutMs = 8000
): Promise<TesteTcpResult> {
  const inicio = Date.now();

  return new Promise<TesteTcpResult>(resolve => {
    const socket = new net.Socket();
    let finalizado = false;

    const finalizar = (sucesso: boolean, erro?: string) => {
      if (finalizado) return;
      finalizado = true;
      socket.destroy();
      const tempoMs = Date.now() - inicio;
      resolve({ host, port, sucesso, tempoMs, erro });
    };

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => finalizar(true));
    socket.once("timeout", () => finalizar(false, `Timeout após ${timeoutMs}ms — porta não respondeu (típico de bloqueio de firewall/VPN)`));
    socket.once("error", (err: NodeJS.ErrnoException) => {
      finalizar(false, err.code ? `${err.code}: ${err.message}` : err.message);
    });

    socket.connect(port, host);
  });
}
