import { syncSheetsToDb } from '../server/syncSheets';

async function main() {
  console.log('Iniciando sincronização forçada com flags...');
  try {
    const count = await syncSheetsToDb();
    console.log(`✅ Sincronização concluída: ${count} registros importados`);
  } catch (err) {
    console.error('❌ Erro na sincronização:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
