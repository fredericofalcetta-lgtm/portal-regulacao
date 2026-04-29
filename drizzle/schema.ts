import { double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela para armazenar os dados da planilha Google Sheets (aba Final).
 * Sincronizada automaticamente todos os dias.
 */
export const regulacaoData = mysqlTable("regulacao_data", {
  id: int("id").autoincrement().primaryKey(),
  agenda: varchar("agenda", { length: 255 }),
  municipio: varchar("municipio", { length: 255 }),
  cotas: int("cotas"),
  saldo: int("saldo"),
  aguardando: int("aguardando"),
  autorizadas: int("autorizadas"),
  autCotas: varchar("aut_cotas", { length: 50 }),
  indexRegula: double("index_regula"),
  aguardando28d: int("aguardando_28d"),
  aguardando60d: int("aguardando_60d"),
  aguardando90d: int("aguardando_90d"),
  central: varchar("central", { length: 100 }),
  especialidade: varchar("especialidade", { length: 255 }),
  flagIndex: text("flag_index"),
  corIndex: varchar("cor_index", { length: 100 }),
  flagAutCotas: text("flag_aut_cotas"),
  corAutCotas: varchar("cor_aut_cotas", { length: 100 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegulacaoData = typeof regulacaoData.$inferSelect;
export type InsertRegulacaoData = typeof regulacaoData.$inferInsert;

/**
 * Tabela para registrar o histórico de sincronizações.
 */
export const syncLog = mysqlTable("sync_log", {
  id: int("id").autoincrement().primaryKey(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  rowCount: int("row_count"),
  status: varchar("status", { length: 50 }).default("success"),
  message: text("message"),
});

export type SyncLog = typeof syncLog.$inferSelect;

/**
 * Tabela para armazenar as listas de prioridades por especialidade (aba Apoio, colunas F e G).
 */
export const prioridades = mysqlTable("prioridades", {
  id: int("id").autoincrement().primaryKey(),
  grandeGrupo: varchar("grande_grupo", { length: 255 }),
  nomeArquivo: varchar("nome_arquivo", { length: 500 }),
  linkUrl: text("link_url"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Prioridade = typeof prioridades.$inferSelect;
export type InsertPrioridade = typeof prioridades.$inferInsert;

/**
 * Tabela para armazenar os reguladores autorizados (aba Reguladores da planilha).
 * Sincronizada automaticamente todos os dias.
 */
export const reguladores = mysqlTable("reguladores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  vinculo: varchar("vinculo", { length: 100 }),
  perfil: varchar("perfil", { length: 100 }),
  grandeGrupo: text("grande_grupo"),
  agendas: text("agendas"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Regulador = typeof reguladores.$inferSelect;
export type InsertRegulador = typeof reguladores.$inferInsert;

/**
 * Tabela para armazenar os protocolos clínicos (aba Apoio, coluna H).
 * Sincronizada automaticamente todos os dias.
 */
export const protocolos = mysqlTable("protocolos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 500 }).notNull(),
  linkUrl: text("link_url"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Protocolo = typeof protocolos.$inferSelect;
export type InsertProtocolo = typeof protocolos.$inferInsert;

/**
 * Tabela para encaminhamentos de agendas.
 * Administradores e monitores encaminham agendas para reguladores.
 */
export const encaminhamentos = mysqlTable("encaminhamentos", {
  id: int("id").autoincrement().primaryKey(),
  agendaId: int("agenda_id").notNull(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull(),
  municipio: varchar("municipio", { length: 255 }),
  central: varchar("central", { length: 100 }),
  especialidade: varchar("especialidade", { length: 255 }).notNull(),
  reguladorEmail: varchar("regulador_email", { length: 320 }).notNull(),
  reguladorNome: varchar("regulador_nome", { length: 255 }).notNull(),
  encaminhadoPorEmail: varchar("encaminhado_por_email", { length: 320 }).notNull(),
  encaminhadoPorNome: varchar("encaminhado_por_nome", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Encaminhamento = typeof encaminhamentos.$inferSelect;
export type InsertEncaminhamento = typeof encaminhamentos.$inferInsert;

/**
 * Tabela para check-ins de agendas.
 * Qualquer perfil pode fazer check-in em uma agenda.
 * Check-ins são removidos automaticamente no logout.
 */
export const checkIns = mysqlTable("check_ins", {
  id: int("id").autoincrement().primaryKey(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = typeof checkIns.$inferInsert;

/**
 * Tabela para agendas concluídas pelo regulador.
 * Criada ao clicar em "Concluído" após um check-in ativo.
 * Pode ser limpa manualmente pelo regulador.
 */
export const agendasConcluidas = mysqlTable("agendas_concluidas", {
  id: int("id").autoincrement().primaryKey(),
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
export const dicionarioEspecialidades = mysqlTable("dicionario_especialidades", {
  id: int("id").autoincrement().primaryKey(),
  agenda: varchar("agenda", { length: 255 }).notNull(),
  especialidade: varchar("especialidade", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DicionarioEspecialidade = typeof dicionarioEspecialidades.$inferSelect;

/**
 * Configuração de especialidades e agendas filtro por regulador.
 * Gerenciada pelo portal (admin/monitor), substitui colunas D e E da planilha Reguladores.
 */
export const reguladorConfig = mysqlTable("regulador_config", {
  id: int("id").autoincrement().primaryKey(),
  reguladorEmail: varchar("regulador_email", { length: 320 }).notNull().unique(),
  // Lista de especialidades separadas por vírgula (ex: "Oncologia,Endocrinologia")
  especialidades: text("especialidades"),
  // Lista de agendas filtro separadas por vírgula (ex: "ENDOCRINOLOGIA DIABETES,ONCOLOGIA MAMA")
  agendasFiltro: text("agendas_filtro"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReguladorConfig = typeof reguladorConfig.$inferSelect;
export type InsertReguladorConfig = typeof reguladorConfig.$inferInsert;

/**
 * Agendas favoritas por regulador.
 * Aparecem diariamente na seção "Encaminhadas para mim" de Minhas Agendas.
 * O regulador pode fazer check-in e concluir; reaparecem a cada renovação do banco.
 */
export const agendasFavoritas = mysqlTable("agendas_favoritas", {
  id: int("id").autoincrement().primaryKey(),
  reguladorEmail: varchar("regulador_email", { length: 320 }).notNull(),
  agendaId: int("agenda_id").notNull(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull(),
  municipio: varchar("municipio", { length: 255 }),
  central: varchar("central", { length: 100 }),
  especialidade: varchar("especialidade", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgendaFavorita = typeof agendasFavoritas.$inferSelect;
export type InsertAgendaFavorita = typeof agendasFavoritas.$inferInsert;

/**
 * Configuração de agendas relacionadas por agenda.
 * Gerenciada pelo portal (admin/monitor).
 * Quando configurada, substitui o comportamento padrão (todas da mesma especialidade).
 * Armazena nomes das agendas relacionadas como JSON array (nomes são estáveis entre syncs).
 */
export const agendasRelacionadasConfig = mysqlTable("agendas_relacionadas_config", {
  id: int("id").autoincrement().primaryKey(),
  agendaNome: varchar("agenda_nome", { length: 255 }).notNull().unique(),
  especialidade: varchar("especialidade", { length: 255 }),
  // JSON array de nomes das agendas relacionadas (ex: ["Agenda A", "Agenda B"])
  relacionadasNomes: text("relacionadas_nomes").notNull().default("[]"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgendasRelacionadasConfig = typeof agendasRelacionadasConfig.$inferSelect;
export type InsertAgendasRelacionadasConfig = typeof agendasRelacionadasConfig.$inferInsert;

/**
 * Tabela para armazenar os dados da aba "Sem cotas" da planilha.
 * Colunas: Especialidade, Município, Aguardando, Autorizados, Central.
 * Inclui flag isNova para indicar agendas que não existiam no dia anterior.
 */
export const semCotas = mysqlTable("sem_cotas", {
  id: int("id").autoincrement().primaryKey(),
  especialidade: varchar("especialidade", { length: 255 }),
  municipio: varchar("municipio", { length: 255 }),
  aguardando: int("aguardando"),
  autorizados: int("autorizados"),
  central: varchar("central", { length: 100 }),
  // Flag para indicar que esta agenda não existia no banco do dia anterior
  isNova: mysqlEnum("is_nova", ["sim", "nao"]).default("nao").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SemCota = typeof semCotas.$inferSelect;
export type InsertSemCota = typeof semCotas.$inferInsert;
