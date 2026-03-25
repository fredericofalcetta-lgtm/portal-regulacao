/**
 * Script para forçar sincronização da aba Final e popular as novas colunas >28d, >60d, >90d
 * Uso: node scripts/force-sync.mjs
 */
import { execSync } from 'child_process';

// Usar tsx para executar TypeScript diretamente
try {
  execSync('npx tsx -e "import(\'./server/syncSheets.ts\').then(async m => { const c = await m.syncSheetsToDb(); console.log(\'OK:\', c); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env }
  });
} catch (e) {
  process.exit(1);
}
