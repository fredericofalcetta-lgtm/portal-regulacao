import { doublePrecision, integer, pgTable, serial, smallint, text, timestamp as pgTimestamp, varchar } from "drizzle-orm/pg-core";

/**
 * ─── Versão PostgreSQL do schema ────────────────────────────────────────────
 * Convertido do MySQL mantendo os MESMOS nomes de tabelas e colunas, com uma
 * regra: no Postgres os nomes de colunas ficam em minúsculas (ex.: "createdAt"
 * do MySQL vira "createdat"). Assim:
 *  - consultas SQL escritas à mão com createdAt/updatedAt continuam funcionando
 *    (o Postgres converte nomes sem aspas para minúsculas);
 *  - a cópia dos dados com pgloader (que por padrão usa minúsculas) encaixa direto.
 * As propriedades usadas no código (ex.: checkIns.createdAt) não mudam.
 *
 * Diferenças de tipo em relação ao MySQL:
 *  - int autoincrement → serial
 *  - double → double precision ; tinyint → smallint
 *  - enum("sim","nao") → varchar com tipo restrito no TypeScript (sem tipo ENUM no banco)
 *  - timestamp → timestamp WITH time zone (instante exato, sem ambiguidade de fuso)
 *  - "ON UPDATE CURRENT_TIMESTAMP" não existe no Postgres: o Drizzle preenche
 *    updatedAt automaticamente nos UPDATEs feitos pelo ORM ($onUpdate).
 */
const int = integer;
const double = doublePrecision;
const tinyint = smallint;
const timestamp = (nome: string) => pgTimestamp(nome, { withTimezone: true, mode: "date" });


/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openid", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginmethod", { length: 64 }),
  role: varchar("role", { length: 20 }).$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastsignedin").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela para armazenar os dados da planilha Google Sheets (aba Final).
 * Sincronizada automaticamente todos os dias.
 */
export const regulacaoData = pgTable("regulacao_data", {
  id: serial("id").primaryKey(),
  agenda: varchar("agenda", { length: 255 }),
  municipio: varchar("municipio", { length: 255 }),
  cotas: int("cotas"),
  saldo: int("saldo"),
  aguardando: int("aguardando"),
  autorizadas: int("autorizadas"),
  autCotas: varchar("aut_cotas", { length: 50 }),
  indexRegula: double("index_regula"),
  aguardando7d: int("aguardando_7d"),
  aguardando28d: int("aguardando_28d"),
  aguardando90d: int("aguardando_90d"),
  central: varchar("central", { length: 100 }),
  especialidade: varchar("especialidade", { length: 255 }),
  flagIndex: text("flag_index"),
  corIndex: text("cor_index"),
  flagAutCotas: text("flag_aut_cotas"),
  corAutCotas: text("cor_aut_cotas"),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type RegulacaoData = typeof regulacaoData.$inferSelect;
export type InsertRegulacaoData = typeof regulacaoData.$inferInsert;

/**
 * Tabela espelho para prévia da migração PostgreSQL.
 * Mesma estrutura que regulacao_data, mas populada via syncFromPostgres().
 * Visível apenas para administradores enquanto a migração está sendo validada.
 */
export const regulacaoDataPg = pgTable("regulacao_data_pg", {
  id: serial("id").primaryKey(),
  agenda: varchar("agenda", { length: 255 }),
  municipio: varchar("municipio", { length: 255 }),
  cotas: int("cotas"),
  saldo: int("saldo"),
  aguardando: int("aguardando"),
  autorizadas: int("autorizadas"),
  autCotas: varchar("aut_cotas", { length: 50 }),
  indexRegula: double("index_regula"),
  aguardando7d: int("aguardando_7d"),
  aguardando28d: int("aguardando_28d"),
  aguardando90d: int("aguardando_90d"),
  central: varchar("central", { length: 100 }),
  especialidade: varchar("especialidade", { length: 255 }),
  flagIndex: text("flag_index"),
  corIndex: text("cor_index"),
  flagAutCotas: text("flag_aut_cotas"),
  corAutCotas: text("cor_aut_cotas"),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type RegulacaoDataPg = typeof regulacaoDataPg.$inferSelect;
export type InsertRegulacaoDataPg = typeof regulacaoDataPg.$inferInsert;

/**
 * Tabela para registrar o histórico de sincronizações.
 */
export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  rowCount: int("row_count"),
  status: varchar("status", { length: 50 }).default("success"),
  message: text("message"),
});

export type SyncLog = typeof syncLog.$inferSelect;

/**
 * Tabela para armazenar as condutas/referências do GERCON (respostas-padrão
 * usadas pelos reguladores para consultorias, por especialidade e situação clínica).
 * Sincronizada a partir de uma consulta SQL no Metabase (ver server/syncMetabase.ts).
 */
export const condutasGercon = pgTable("condutas_gercon", {
  id: serial("id").primaryKey(),
  especialidade: varchar("especialidade", { length: 255 }).notNull(),
  situacao: text("situacao").notNull(),
  ciapCid: text("ciap_cid"),
  conduta: text("conduta").notNull(),
  referencias: text("referencias"),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type CondutaGercon = typeof condutasGercon.$inferSelect;
export type InsertCondutaGercon = typeof condutasGercon.$inferInsert;

/**
 * Log de sincronização específico das condutas do GERCON (fonte: Metabase).
 * Mantido separado do sync_log geral para não misturar com as sincronizações
 * da planilha Google Sheets.
 */
export const condutasGerconSyncLog = pgTable("condutas_gercon_sync_log", {
  id: serial("id").primaryKey(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  rowCount: int("row_count"),
  status: varchar("status", { length: 50 }).default("success"),
  message: text("message"),
});

export type CondutasGerconSyncLog = typeof condutasGerconSyncLog.$inferSelect;

/**
 * Tabela para armazenar as listas de prioridades por especialidade (aba Apoio, colunas F e G).
 */
export const prioridades = pgTable("prioridades", {
  id: serial("id").primaryKey(),
  grandeGrupo: varchar("grande_grupo", { length: 255 }),
  nomeArquivo: varchar("nome_arquivo", { length: 500 }),
  linkUrl: text("link_url"),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Prioridade = typeof prioridades.$inferSelect;
export type InsertPrioridade = typeof prioridades.$inferInsert;

/**
 * Tabela para armazenar os reguladores autorizados (aba Reguladores da planilha).
 * Sincronizada automaticamente todos os dias.
 */
export const reguladores = pgTable("reguladores", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  vinculo: varchar("vinculo", { length: 100 }),
  perfil: varchar("perfil", { length: 100 }),
  grandeGrupo: text("grande_grupo"),
  agendas: text("agendas"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  ativo: varchar("ativo", { length: 3 }).$type<"sim" | "nao">().default("sim").notNull(),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Regulador = typeof reguladores.$inferSelect;
export type InsertRegulador = typeof reguladores.$inferInsert;

/**
 * Tabela para armazenar os protocolos clínicos (aba Apoio, coluna H).
 * Sincronizada automaticamente todos os dias.
 */
export const protocolos = pgTable("protocolos", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 500 }).notNull(),
  linkUrl: text("link_url"),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Protocolo = typeof protocolos.$inferSelect;
export type InsertProtocolo = typeof protocolos.$inferInsert;

/**
 * Tabela para encaminhamentos de agendas.
 * Administradores e monitores encaminham agendas para reguladores.
 */
export const encaminhamentos = pgTable("encaminhamentos", {
  id: serial("id").primaryKey(),
  agendaId: int("agenda_id").notNull(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull(),
  municipio: varchar("municipio", { length: 255 }),
  central: varchar("central", { length: 100 }),
  especialidade: varchar("especialidade", { length: 255 }).notNull(),
  reguladorEmail: varchar("regulador_email", { length: 320 }).notNull(),
  reguladorNome: varchar("regulador_nome", { length: 255 }).notNull(),
  encaminhadoPorEmail: varchar("encaminhado_por_email", { length: 320 }).notNull(),
  encaminhadoPorNome: varchar("encaminhado_por_nome", { length: 255 }).notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

export type Encaminhamento = typeof encaminhamentos.$inferSelect;
export type InsertEncaminhamento = typeof encaminhamentos.$inferInsert;

/**
 * Tabela para check-ins de agendas.
 * Qualquer perfil pode fazer check-in em uma agenda.
 * Check-ins são removidos automaticamente no logout.
 */
export const checkIns = pgTable("check_ins", {
  id: serial("id").primaryKey(),
  agendaId: int("agenda_id").notNull(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull(),
  municipio: varchar("municipio", { length: 255 }),
  especialidade: varchar("especialidade", { length: 255 }).notNull(),
  central: varchar("central", { length: 100 }),
  cotas: int("cotas"),
  saldo: int("saldo"),
  aguardando: int("aguardando"),
  indexRegula: double("index_regula"),
  usuarioEmail: varchar("usuario_email", { length: 320 }).notNull(),
  usuarioNome: varchar("usuario_nome", { length: 255 }).notNull(),
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = typeof checkIns.$inferInsert;

/**
 * Tabela para agendas concluídas pelo regulador.
 * Criada ao clicar em "Concluído" após um check-in ativo.
 * Pode ser limpa manualmente pelo regulador.
 */
export const agendasConcluidas = pgTable("agendas_concluidas", {
  id: serial("id").primaryKey(),
  agendaId: int("agenda_id").notNull(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull(),
  municipio: varchar("municipio", { length: 255 }),
  especialidade: varchar("especialidade", { length: 255 }).notNull(),
  central: varchar("central", { length: 100 }),
  cotas: int("cotas"),
  saldo: int("saldo"),
  aguardando: int("aguardando"),
  indexRegula: double("index_regula"),
  usuarioEmail: varchar("usuario_email", { length: 320 }).notNull(),
  usuarioNome: varchar("usuario_nome", { length: 255 }).notNull(),
  concluidoEm: timestamp("concluido_em").defaultNow().notNull(),
});

export type AgendaConcluida = typeof agendasConcluidas.$inferSelect;
export type InsertAgendaConcluida = typeof agendasConcluidas.$inferInsert;

/**
 * Dicionário de especialidades: mapeia agenda → especialidade.
 * Sincronizado da aba 'Dicionário - Especialidades' da planilha.
 */
export const dicionarioEspecialidades = pgTable("dicionario_especialidades", {
  id: serial("id").primaryKey(),
  agenda: varchar("agenda", { length: 255 }).notNull(),
  especialidade: varchar("especialidade", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type DicionarioEspecialidade = typeof dicionarioEspecialidades.$inferSelect;

/**
 * Configuração de especialidades e agendas filtro por regulador.
 * Gerenciada pelo portal (admin/monitor), substitui colunas D e E da planilha Reguladores.
 */
export const reguladorConfig = pgTable("regulador_config", {
  id: serial("id").primaryKey(),
  reguladorEmail: varchar("regulador_email", { length: 320 }).notNull().unique(),
  // Lista de especialidades separadas por vírgula (ex: "Oncologia,Endocrinologia")
  especialidades: text("especialidades"),
  // Lista de agendas filtro separadas por vírgula (ex: "ENDOCRINOLOGIA DIABETES,ONCOLOGIA MAMA")
  agendasFiltro: text("agendas_filtro"),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type ReguladorConfig = typeof reguladorConfig.$inferSelect;
export type InsertReguladorConfig = typeof reguladorConfig.$inferInsert;

/**
 * Agendas favoritas por regulador.
 * Aparecem diariamente na seção "Encaminhadas para mim" de Minhas Agendas.
 * O regulador pode fazer check-in e concluir; reaparecem a cada renovação do banco.
 */
export const agendasFavoritas = pgTable("agendas_favoritas", {
  id: serial("id").primaryKey(),
  reguladorEmail: varchar("regulador_email", { length: 320 }).notNull(),
  agendaId: int("agenda_id").notNull(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull(),
  municipio: varchar("municipio", { length: 255 }),
  central: varchar("central", { length: 100 }),
  especialidade: varchar("especialidade", { length: 255 }),
  createdAt: timestamp("createdat").defaultNow().notNull(),
});

export type AgendaFavorita = typeof agendasFavoritas.$inferSelect;
export type InsertAgendaFavorita = typeof agendasFavoritas.$inferInsert;

/**
 * Configuração de agendas relacionadas por agenda.
 * Gerenciada pelo portal (admin/monitor).
 * Quando configurada, substitui o comportamento padrão (todas da mesma especialidade).
 * Armazena nomes das agendas relacionadas como JSON array (nomes são estáveis entre syncs).
 */
export const agendasRelacionadasConfig = pgTable("agendas_relacionadas_config", {
  id: serial("id").primaryKey(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull().unique(),
  especialidade: varchar("especialidade", { length: 255 }),
  // JSON array de nomes das agendas relacionadas (ex: ["Agenda A", "Agenda B"])
  relacionadasNomes: text("relacionadas_nomes").notNull().default("[]"),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type AgendasRelacionadasConfig = typeof agendasRelacionadasConfig.$inferSelect;
export type InsertAgendasRelacionadasConfig = typeof agendasRelacionadasConfig.$inferInsert;

/**
 * Tabela para armazenar os dados da aba "Sem cotas" da planilha.
 * Colunas: Especialidade, Município, Aguardando, Autorizados, Central.
 * Inclui flag isNova para indicar agendas que não existiam no dia anterior.
 */
export const semCotas = pgTable("sem_cotas", {
  id: serial("id").primaryKey(),
  // Coluna 0: Espec Sem Cotas (nome da agenda)
  especialidade: varchar("especialidade", { length: 255 }),
  // Coluna 1: Município
  municipio: varchar("municipio", { length: 255 }),
  // Coluna 2: Aguardando
  aguardando: int("aguardando"),
  // Coluna 3: Autorizados
  autorizados: int("autorizados"),
  // Coluna 4: Novas cotas
  novasCotas: int("novas_cotas"),
  // Coluna 5: Central
  central: varchar("central", { length: 100 }),
  // Coluna 6: Especialidade (categoria)
  especialidadeCategoria: varchar("especialidade_categoria", { length: 255 }),
  // Flag para indicar que esta agenda não existia no banco do dia anterior
  isNova: varchar("is_nova", { length: 3 }).$type<"sim" | "nao">().default("nao").notNull(),
  // Data em que a agenda apareceu pela primeira vez no banco
  createdAt: timestamp("createdat").defaultNow().notNull(),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SemCota = typeof semCotas.$inferSelect;
export type InsertSemCota = typeof semCotas.$inferInsert;

/**
 * Configuração de protocolos/prioridades vinculados a uma agenda
 */
export const agendaProtocolos = pgTable("agenda_protocolos", {
  id: serial("id").primaryKey(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull().unique(),
  protocolosNomes: text("protocolos_nomes").notNull(),
  prioridadesNomes: text("prioridades_nomes").notNull(),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type AgendaProtocolo = typeof agendaProtocolos.$inferSelect;
export type InsertAgendaProtocolo = typeof agendaProtocolos.$inferInsert;

/**
 * Observações específicas por agenda + central
 */
export const agendaObservacoes = pgTable("agenda_observacoes", {
  id: serial("id").primaryKey(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull(),
  central: varchar("central", { length: 100 }).notNull(),
  observacao: text("observacao").notNull(),
  updatedAt: timestamp("updatedat").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type AgendaObservacao = typeof agendaObservacoes.$inferSelect;
export type InsertAgendaObservacao = typeof agendaObservacoes.$inferInsert;

/**
 * Log de login/logout dos reguladores.
 * Registra horário de entrada e saída para monitoramento.
 */
export const loginLog = pgTable("login_log", {
  id: serial("id").primaryKey(),
  reguladorEmail: varchar("regulador_email", { length: 320 }).notNull(),
  reguladorNome: varchar("regulador_nome", { length: 255 }),
  loginAt: timestamp("login_at").defaultNow().notNull(),
  logoutAt: timestamp("logout_at"),
  /** Último heartbeat recebido do navegador (interação real com o portal). */
  ultimaAtividadeAt: timestamp("ultima_atividade_at"),
});

export type LoginLog = typeof loginLog.$inferSelect;
export type InsertLoginLog = typeof loginLog.$inferInsert;

/**
 * Histórico PERMANENTE de atividade de regulação (somente inserção).
 * Necessário porque check_ins é apagada no check-out/após 24h e
 * agendas_concluidas pode ser limpa pelo próprio usuário.
 * tipo: 'checkin' | 'conclusao'
 */
export const atividadeLog = pgTable("atividade_log", {
  id: serial("id").primaryKey(),
  usuarioEmail: varchar("usuario_email", { length: 320 }).notNull(),
  usuarioNome: varchar("usuario_nome", { length: 255 }),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  agendaNome: varchar("agenda_nome", { length: 255 }),
  municipio: varchar("municipio", { length: 255 }),
  central: varchar("central", { length: 100 }),
  especialidade: varchar("especialidade", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AtividadeLog = typeof atividadeLog.$inferSelect;

/**
 * Recados enviados pelo administrador para toda a equipe.
 */
export const recados = pgTable("recados", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem").notNull(),
  autorEmail: varchar("autor_email", { length: 320 }).notNull(),
  autorNome: varchar("autor_nome", { length: 255 }),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  ativo: tinyint("ativo").default(1).notNull(),
});

export type Recado = typeof recados.$inferSelect;
export type InsertRecado = typeof recados.$inferInsert;

/**
 * Registro de quais colaboradores já viram cada recado.
 */
export const recadosLidos = pgTable("recados_lidos", {
  id: serial("id").primaryKey(),
  recadoId: int("recado_id").notNull(),
  usuarioEmail: varchar("usuario_email", { length: 320 }).notNull(),
  lidoEm: timestamp("lido_em").defaultNow().notNull(),
});

export type RecadoLido = typeof recadosLidos.$inferSelect;
export type InsertRecadoLido = typeof recadosLidos.$inferInsert;
