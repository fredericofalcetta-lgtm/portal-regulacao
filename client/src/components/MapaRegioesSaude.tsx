/**
 * MapaRegioesSaude.tsx — janela "Regiões de saúde do RS"
 *
 * Aberta SOMENTE sob demanda, pelo botão "RS" da barra azul de check-in
 * (Lista de agendas). Não substitui nem altera as agendas relacionadas,
 * que continuam aparecendo normalmente abaixo da barra.
 *
 * Conteúdo:
 *  - mapa do RS com os números das 30 regiões de saúde (cor = macrorregião);
 *  - lista logo abaixo: macrorregião → região de saúde (com CRS) → municípios;
 *  - busca por município, região ou CRS;
 *  - a região do município da agenda em regulação já abre destacada.
 *
 * Fontes: contornos gerados a partir da malha municipal do IBGE (uso livre),
 * simplificados; divisão macro/CRS/região conferida pela equipe de regulação.
 * Para corrigir um nome, CRS ou município, edite apenas o array REGIOES abaixo.
 */
import { useEffect, useMemo, useState } from 'react';
import { Map as MapIcon, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Regiao {
  num: string;          // número da região de saúde (01–30)
  nome: string;         // nome da região
  crs: string;          // número da Coordenadoria Regional de Saúde
  macro: string;        // macrorregião
  lx: number; ly: number; // posição do número no mapa
  d: string;            // contorno (SVG path) — não editar à mão
  municipios: string[];
}

// Cor de preenchimento e cor do texto por macrorregião
const CORES_MACRO: Record<string, { fill: string; text: string }> = {
  'Centro-Oeste': { fill: '#FAC775', text: '#633806' },
  'Metropolitana': { fill: '#B5D4F4', text: '#0C447C' },
  'Missioneira': { fill: '#C0DD97', text: '#27500A' },
  'Norte': { fill: '#F5C4B3', text: '#712B13' },
  'Sul': { fill: '#9FE1CB', text: '#085041' },
  'Serra': { fill: '#CECBF6', text: '#3C3489' },
  'Vales': { fill: '#F4C0D1', text: '#72243E' },
};

const MAPA_W = 420;
const MAPA_H = 407;

// prettier-ignore
const REGIOES: Regiao[] = [
  { num: "01", nome: "Verdes Campos", crs: "4", macro: "Centro-Oeste", lx: 209, ly: 154,
    d: "M166 161L170 152L175 152L171 145L173 142L182 142L191 123L197 130L199 126L208 126L216 115L219 122L232 127L234 140L230 144L244 151L239 172L241 176L221 194L218 202L213 201L211 204L208 202L208 208L205 210L195 207L196 202L191 194L199 178L192 177L189 173L175 174L178 167L176 162L166 161Z",
    municipios: ["Agudo", "Dilermando de Aguiar", "Dona Francisca", "Faxinal do Soturno", "Formigueiro", "Itaara", "Ivorá", "Júlio de Castilhos", "Nova Palma", "Paraíso do Sul", "Pinhal Grande", "Quevedos", "Restinga Seca", "Santa Maria", "São João do Polêsine", "São Martinho da Serra", "São Pedro do Sul", "São Sepé", "Silveira Martins", "Toropi", "Vila Nova do Sul"] },
  { num: "02", nome: "Entre Rios", crs: "4", macro: "Centro-Oeste", lx: 148, ly: 137,
    d: "M111 99L116 96L128 97L130 103L137 103L151 109L155 107L157 100L162 107L171 112L172 117L168 121L172 127L175 129L177 123L184 129L189 129L181 143L173 142L171 145L175 152L168 155L166 162L176 162L178 167L175 174L153 179L149 185L143 182L136 187L134 180L123 183L134 166L133 160L127 155L120 155L122 146L117 139L114 140L118 137L115 130L123 130L126 120L111 99Z",
    municipios: ["Cacequi", "Capão do Cipó", "Itacurubi", "Jaguari", "Jarí", "Mata", "Nova Esperança do Sul", "Santiago", "São Francisco de Assis", "São Vicente do Sul", "Unistalda"] },
  { num: "03", nome: "Fronteira Oeste", crs: "10", macro: "Centro-Oeste", lx: 82, ly: 163,
    d: "M0 190L10 185L16 178L18 168L28 164L45 145L56 124L65 122L67 114L75 113L81 108L83 112L96 117L113 117L115 122L120 115L127 120L123 130L115 130L118 137L114 140L117 139L122 146L120 155L127 155L133 160L134 166L128 174L124 184L135 180L136 187L143 182L149 185L153 179L157 180L166 174L179 172L199 178L191 194L196 202L195 207L199 210L191 220L185 221L184 225L174 223L169 216L155 214L148 223L139 222L138 230L132 238L137 259L127 255L121 241L109 229L105 231L104 236L102 236L94 243L86 244L86 226L43 184L30 183L22 196L6 196L0 190Z",
    municipios: ["Alegrete", "Barra do Quarai", "Itaqui", "Maçambara", "Manoel Viana", "Quarai", "Rosário do Sul", "Santa Margarida do Sul", "Santana do Livramento", "São Gabriel", "Uruguaiana"] },
  { num: "04", nome: "Belas Praias", crs: "18", macro: "Metropolitana", lx: 403, ly: 147,
    d: "M385 156L387 144L390 145L388 148L395 149L396 146L392 146L390 137L402 138L398 133L406 129L419 137L400 170L385 156Z",
    municipios: ["Arroio do Sal", "Capão da Canoa", "Dom Pedro de Alcântara", "Itati", "Mampituba", "Maquine", "Morrinhos do Sul", "Terra de Areia", "Torres", "Três Cachoeiras", "Três Forquilhas", "Xangri-lá"] },
  { num: "05", nome: "Bons Ventos", crs: "18", macro: "Metropolitana", lx: 383, ly: 176,
    d: "M338 267L342 256L342 243L345 245L352 242L353 233L364 228L367 224L366 200L370 202L371 198L372 202L369 205L373 207L375 194L365 177L368 170L364 165L367 165L367 159L374 162L380 159L392 160L400 170L386 209L361 248L341 269L338 267Z",
    municipios: ["Balneário Pinhal", "Capivari do Sul", "Caraá", "Cidreira", "Imbé", "Mostardas", "Osório", "Palmares do Sul", "Santo Antônio da Patrulha", "Tavares", "Tramandaí"] },
  { num: "06", nome: "Vale do Paranhana/Costa Serra", crs: "1", macro: "Metropolitana", lx: 370, ly: 125,
    d: "M353 165L354 159L359 152L356 148L363 142L370 142L367 137L359 133L359 125L354 121L362 118L359 106L364 103L372 105L379 114L381 125L393 123L394 121L389 117L390 113L395 111L393 107L406 111L408 116L404 121L407 121L406 124L395 132L402 138L390 137L392 146L396 146L395 150L388 148L390 145L387 144L386 160L373 162L368 158L367 165L353 165Z",
    municipios: ["Cambará do Sul", "Igrejinha", "Parobé", "Riozinho", "Rolante", "São Francisco de Paula", "Taquara", "Três Coroas"] },
  { num: "07", nome: "Vale dos Sinos", crs: "1", macro: "Metropolitana", lx: 346, ly: 157,
    d: "M335 150L339 147L350 146L351 141L359 152L354 159L354 164L347 168L335 164L335 150Z",
    municipios: ["Araricá", "Campo Bom", "Dois Irmãos", "Estância Velha", "Ivoti", "Lindolfo Collor", "Morro Reuter", "Nova Hartz", "Novo Hamburgo", "Portão", "Presidente Lucena", "Santa Maria do Herval", "São Leopoldo", "Sapiranga", "São José do Hortêncio"] },
  { num: "08", nome: "Vale do Caí/Metropolitana", crs: "1", macro: "Metropolitana", lx: 325, ly: 162,
    d: "M309 161L313 154L317 155L314 147L321 145L317 144L318 140L330 138L330 149L335 149L336 153L335 164L347 167L343 176L313 175L311 167L313 161L309 161Z",
    municipios: ["Barão", "Brochier", "Canoas", "Capela de Santana", "Esteio", "Harmonia", "Maratá", "Montenegro", "Nova Santa Rita", "Pareci Novo", "Salvador do Sul", "São José do Sul", "São Pedro da Serra", "São Sebastião do Caí", "Sapucaia do Sul", "Tabaí", "Triunfo", "Tupandi"] },
  { num: "09", nome: "Carbonífera/Costa Doce", crs: "1", macro: "Metropolitana", lx: 312, ly: 202,
    d: "M274 213L282 199L286 205L290 205L290 177L297 174L295 173L296 160L308 170L313 170L313 175L324 174L329 177L335 175L337 179L335 179L334 188L335 197L340 196L341 202L346 200L343 209L342 203L337 207L335 214L336 227L336 228L334 218L330 218L331 231L324 235L328 244L318 248L318 255L308 256L309 247L304 234L292 233L289 225L284 227L279 215L274 213Z",
    municipios: ["Arambaré", "Arroio dos Ratos", "Barão do Triunfo", "Barra do Ribeiro", "Butiá", "Camaquã", "Cerro Grande do Sul", "Charqueadas", "Chuvisca", "Dom Feliciano", "Eldorado do Sul", "General Câmara", "Guaíba", "Mariana Pimentel", "Minas do Leão", "São Jerônimo", "Sentinela do Sul", "Sertão Santana", "Tapes"] },
  { num: "10", nome: "Capital/Vale do Gravataí", crs: "1", macro: "Metropolitana", lx: 354, ly: 182,
    d: "M335 175L344 176L347 168L365 164L368 170L365 177L371 185L369 195L356 198L356 205L348 202L350 195L342 194L338 189L339 187L336 185L339 181L335 182L337 179L335 175Z",
    municipios: ["Alvorada", "Cachoeirinha", "Glorinha", "Gravataí", "Porto Alegre", "Viamão"] },
  { num: "11", nome: "Sete Povos das Missões", crs: "12", macro: "Missioneira", lx: 145, ly: 82,
    d: "M70 112L71 105L77 103L87 93L86 87L93 85L93 78L103 82L104 77L99 71L108 63L110 66L114 61L116 62L120 58L119 55L129 47L133 50L137 47L136 57L140 59L147 57L153 60L153 57L160 57L160 52L163 63L170 60L172 66L183 65L187 70L184 78L188 82L185 83L185 93L175 97L175 100L172 99L171 100L175 112L172 117L169 111L162 107L157 100L155 107L151 109L134 101L130 103L128 97L121 96L111 99L124 115L119 116L115 122L113 117L96 117L83 112L81 108L75 113L70 112Z",
    municipios: ["São Borja", "Santo Ângelo", "São Luiz Gonzaga", "Santo Antônio das Missões", "Cerro Largo", "Porto Xavier", "Entre-Ijuís", "São Miguel das Missões", "Guarani das Missões", "Roque Gonzales", "Bossoroca", "São Nicolau", "Caibaté", "Vitória das Missões", "Garruchos", "Rolador", "Dezesseis de Novembro", "Pirapó", "Eugênio de Castro", "São Pedro do Butiá", "Ubiretama", "Salvador das Missões", "Sete de Setembro", "Mato Queimado"] },
  { num: "12", nome: "Portal das Missões", crs: "9", macro: "Missioneira", lx: 235, ly: 91,
    d: "M168 121L174 113L195 111L198 106L194 105L193 97L204 83L221 90L226 80L224 71L230 67L235 66L239 74L244 75L243 79L248 77L249 101L243 103L241 109L236 109L238 116L246 114L253 120L247 121L242 128L224 124L218 121L216 115L208 126L199 126L197 131L191 123L189 129L183 129L177 123L175 128L173 128L168 121Z",
    municipios: ["Boa Vista do Cadeado", "Boa Vista do Incra", "Colorado", "Cruz Alta", "Fortaleza dos Valos", "Ibirubá", "Jacuizinho", "Quinze de Novembro", "Saldanha Marinho", "Salto do Jacuí", "Santa Bárbara do Sul", "Selbach", "Tupanciretã"] },
  { num: "13", nome: "Região da Diversidade", crs: "17", macro: "Missioneira", lx: 202, ly: 67,
    d: "M171 101L172 98L175 100L175 97L185 93L185 83L187 82L184 78L187 73L183 65L189 63L185 57L190 53L186 49L195 45L189 40L191 36L188 32L189 29L182 29L177 23L179 19L183 19L198 28L198 31L204 30L206 35L204 42L209 52L215 56L218 65L222 61L229 69L224 71L226 80L220 91L205 83L197 90L194 97L194 105L198 106L195 111L175 113L171 101Z",
    municipios: ["Ajuricaba", "Augusto Pestana", "Bozano", "Campo Novo", "Catuípe", "Chiapetta", "Condor", "Coronel Barros", "Crissiumal", "Humaitá", "Ijuí", "Inhacorá", "Jóia", "Nova Ramada", "Panambi", "Pejuçara", "Santo Augusto", "São Martinho", "São Valério do Sul", "Sede Nova"] },
  { num: "14", nome: "Fronteira Noroeste", crs: "14", macro: "Missioneira", lx: 173, ly: 43,
    d: "M135 43L143 42L149 28L152 31L156 30L157 26L160 28L162 23L164 26L171 20L174 24L175 20L180 23L180 28L189 29L188 32L191 36L189 40L195 45L186 49L190 54L185 57L189 63L178 66L171 66L170 60L163 63L160 52L160 57L154 57L153 60L147 57L140 59L136 57L138 46L135 43Z",
    municipios: ["Alecrim", "Alegria", "Boa Vista do Buricá", "Campina das Missões", "Cândido Godói", "Doutor Maurício Cardoso", "Giruá", "Horizontina", "Independência", "Nova Candelária", "Novo Machado", "Porto Lucena", "Porto Mauá", "Porto Vera Cruz", "Santa Rosa", "Santo Cristo", "São José do Inhacorá", "São Paulo das Missões", "Senador Salgado Filho", "Três de Maio", "Tucunduva", "Tuparendi"] },
  { num: "15", nome: "Caminho das Águas", crs: "2", macro: "Norte", lx: 224, ly: 18,
    d: "M181 20L183 11L188 13L195 4L210 5L211 9L215 6L219 7L219 3L223 4L226 1L230 3L229 8L237 4L241 5L244 0L243 4L246 4L249 14L248 18L241 18L238 22L243 22L243 28L248 31L241 35L239 31L232 31L231 27L227 33L215 33L216 23L213 24L211 21L201 22L204 29L198 31L197 27L181 20Z",
    municipios: ["Alpestre", "Ametista do Sul", "Barra do Guarita", "Bom Progresso", "Caiçara", "Cristal do Sul", "Derrubadas", "Erval Seco", "Esperança do Sul", "Frederico Westphalen", "Iraí", "Liberato Salzano", "Novo Tiradentes", "Palmitinho", "Pinhal", "Pinheirinho do Vale", "Planalto", "Rodeio Bonito", "Seberi", "Taquaruçu do Sul", "Tenente Portela", "Tiradentes do Sul", "Três Passos", "Vicente Dutra", "Vista Alegre", "Vista Gaúcha"] },
  { num: "16", nome: "Alto Uruguai Gaúcho", crs: "11", macro: "Norte", lx: 278, ly: 34,
    d: "M238 22L241 18L248 18L247 5L249 7L253 5L262 12L263 10L272 11L275 8L278 14L282 15L282 11L285 11L283 13L286 15L289 12L293 16L298 15L301 18L298 20L301 21L300 24L303 23L304 27L306 24L307 28L304 30L304 39L300 45L302 47L303 55L297 56L293 52L277 56L266 53L268 50L259 40L259 29L255 23L251 19L244 23L238 22Z",
    municipios: ["Aratiba", "Áurea", "Barão de Cotegipe", "Barra do Rio Azul", "Benjamin Constant do Sul", "Campinas do Sul", "Carlos Gomes", "Centenário", "Charrua", "Cruzaltense", "Entre Rios do Sul", "Erebango", "Erechim", "Erval Grande", "Estação", "Faxinalzinho", "Floriano Peixoto", "Gaurama", "Getúlio Vargas", "Ipiranga do Sul", "Itatiba do Sul", "Jacutinga", "Marcelino Ramos", "Mariano Moro", "Nonoai", "Paulo Bento", "Ponte Preta", "Quatro Irmãos", "Rio dos Índios", "São Valentim", "Severiano de Almeida", "Três Arroios", "Viadutos"] },
  { num: "17", nome: "Região do Planalto", crs: "6", macro: "Norte", lx: 266, ly: 70,
    d: "M238 74L248 67L244 63L245 58L254 60L261 51L277 56L293 52L288 62L288 70L293 75L308 71L308 74L311 74L314 78L305 92L306 102L299 103L299 99L286 103L285 96L275 90L271 91L265 88L260 98L258 94L250 92L248 77L243 79L244 75L238 74Z",
    municipios: ["Almirante Tamandaré do Sul", "Camargo", "Carazinho", "Casca", "Ciríaco", "Coqueiros do Sul", "Coxilha", "David Canabarro", "Ernestina", "Gentil", "Lagoa dos Três Cantos", "Marau", "Mato Castelhano", "Montauri", "Muliterno", "Não-Me-Toque", "Nicolau Vergueiro", "Nova Alvorada", "Passo Fundo", "Pontão", "Santo Antônio do Palma", "Santo Antônio do Planalto", "São Domingos do Sul", "Serafina Corrêa", "Sertão", "Vanini", "Victor Graeff", "Vila Maria"] },
  { num: "18", nome: "Região das Araucárias", crs: "6", macro: "Norte", lx: 318, ly: 58,
    d: "M287 68L293 55L303 55L300 45L304 39L304 30L309 25L318 25L321 31L325 29L328 35L330 33L334 36L335 41L331 49L333 58L337 61L338 65L330 71L334 77L329 97L319 97L318 85L311 84L314 75L308 74L308 71L293 75L287 68Z",
    municipios: ["Água Santa", "André da Rocha", "Barracão", "Cacique Doble", "Capão Bonito do Sul", "Caseiros", "Ibiaçá", "Ibiraiaras", "Lagoa Vermelha", "Machadinho", "Maximiliano de Almeida", "Paim Filho", "Sananduva", "Santa Cecília do Sul", "Santo Expedito do Sul", "São João da Urtiga", "São José do Ouro", "Tapejara", "Tupanci do Sul", "Vila Lângaro"] },
  { num: "19", nome: "Região do Botucaraí", crs: "6", macro: "Norte", lx: 266, ly: 114,
    d: "M236 109L241 109L243 103L248 102L250 92L258 94L260 98L261 95L266 87L271 91L280 92L285 96L285 102L294 101L298 109L289 110L286 119L281 118L283 127L276 126L273 132L263 131L259 139L251 136L251 130L245 126L247 121L253 119L246 114L238 116L236 109Z",
    municipios: ["Alto Alegre", "Arvorezinha", "Barros Cassal", "Campos Borges", "Espumoso", "Fontoura Xavier", "Ibirapuitã", "Itapuca", "Lagoão", "Mormaço", "Soledade", "Tapera", "Tio Hugo", "Tunas"] },
  { num: "20", nome: "Rota da Produção", crs: "15", macro: "Norte", lx: 232, ly: 49,
    d: "M201 22L216 22L215 33L227 33L231 27L232 31L239 31L241 35L248 33L243 28L243 24L251 19L259 28L259 40L268 51L259 52L253 60L247 59L245 58L248 67L241 72L234 65L229 68L222 61L218 65L215 56L209 52L204 42L206 35L202 30L204 28L201 22Z",
    municipios: ["Barra Funda", "Boa Vista das Missões", "Braga", "Cerro Grande", "Chapada", "Constantina", "Coronel Bicaco", "Dois Irmãos das Missões", "Engenho Velho", "Gramado dos Loureiros", "Jaboticaba", "Lajeado do Bugre", "Miraguaí", "Nova Boa Vista", "Novo Barreiro", "Novo Xingu", "Palmeira das Missões", "Redentora", "Ronda Alta", "Rondinha", "Sagrada Família", "São José das Missões", "São Pedro das Missões", "Sarandi", "Três Palmeiras", "Trindade do Sul"] },
  { num: "21", nome: "Região Sul", crs: "3", macro: "Sul", lx: 248, ly: 274,
    d: "M292 287L293 287L294 289L306 292L308 290L305 288L316 286L325 274L327 276L326 273L328 268L331 271L338 267L341 269L326 283L304 297L294 311L297 296L292 287ZM195 295L205 284L205 278L214 275L216 263L211 260L217 254L219 241L223 237L223 227L233 226L235 221L232 213L234 206L239 215L248 223L248 229L245 233L245 235L260 233L265 237L276 233L274 227L276 218L284 227L289 225L292 233L304 234L308 241L309 255L299 263L296 281L287 283L285 291L292 297L287 298L285 303L288 304L286 305L287 305L292 301L293 301L293 300L287 301L291 298L295 303L294 311L290 312L282 322L263 371L226 406L217 403L218 393L221 396L222 392L220 377L223 370L228 364L231 368L237 359L239 348L241 351L246 345L246 350L252 355L258 353L267 332L261 319L265 309L259 310L256 317L255 321L260 323L259 325L248 329L241 340L236 340L214 328L207 306L195 295Z",
    municipios: ["Amaral Ferrador", "Arroio do Padre", "Arroio Grande", "Canguçu", "Capão do Leão", "Cerrito", "Chuí", "Cristal", "Herval", "Jaguarão", "Morro Redondo", "Pedras Altas", "Pedro Osório", "Pelotas", "Pinheiro Machado", "Piratini", "Rio Grande", "Santana da Boa Vista", "Santa Vitória do Palmar", "São José do Norte", "São Lourenço do Sul", "Turuçu"] },
  { num: "22", nome: "Pampa", crs: "7", macro: "Sul", lx: 186, ly: 254,
    d: "M132 238L138 230L139 222L148 223L154 214L169 216L174 223L184 225L185 221L191 220L200 207L206 212L203 217L203 226L206 225L210 231L214 230L214 234L223 237L217 254L211 260L216 263L214 275L205 278L205 284L197 291L195 298L191 294L188 296L168 279L161 267L148 266L143 262L135 252L132 238Z",
    municipios: ["Aceguá", "Bagé", "Candiota", "Dom Pedrito", "Hulha Negra", "Lavras do Sul"] },
  { num: "23", nome: "Caxias e Hortênsias", crs: "5", macro: "Serra", lx: 347, ly: 132,
    d: "M335 123L355 119L344 110L346 107L348 109L353 105L360 107L362 118L354 122L359 125L359 133L367 137L370 142L363 142L356 148L351 141L350 146L337 148L340 142L335 123Z",
    municipios: ["Canela", "Caxias do Sul", "Gramado", "Linha Nova", "Nova Petrópolis", "Picada Café"] },
  { num: "24", nome: "Campos de Cima da Serra", crs: "5", macro: "Serra", lx: 351, ly: 80,
    d: "M329 90L334 77L330 71L338 65L337 61L333 58L331 47L335 39L346 46L350 54L355 54L358 64L362 65L371 80L385 82L385 84L391 82L395 86L397 82L398 86L405 83L407 85L407 84L411 83L412 86L416 84L420 94L415 94L410 102L407 100L406 111L393 107L395 111L390 113L389 117L394 121L390 126L380 125L379 114L371 105L364 103L357 107L353 105L343 110L339 105L343 96L337 91L331 96L329 90Z",
    municipios: ["Bom Jesus", "Campestre da Serra", "Esmeralda", "Jaquirana", "Monte Alegre dos Campos", "Muitos Capões", "Pinhal da Serra", "São José dos Ausentes", "Vacaria"] },
  { num: "25", nome: "Vinhedos e Basalto", crs: "5", macro: "Serra", lx: 318, ly: 108,
    d: "M294 100L306 102L305 92L310 84L318 85L319 97L326 96L328 98L326 118L330 129L325 129L325 133L332 135L332 139L323 139L314 143L314 136L309 133L311 133L313 120L310 113L298 111L294 100Z",
    municipios: ["Bento Gonçalves", "Boa Vista do Sul", "Carlos Barbosa", "Coronel Pilar", "Cotiporã", "Fagundes Varela", "Garibaldi", "Guabiju", "Guaporé", "Monte Belo do Sul", "Nova Araçá", "Nova Bassano", "Nova Prata", "Paraí", "Pinto Bandeira", "Protásio Alves", "Santa Tereza", "São Jorge", "União da Serra", "Veranópolis", "Vila Flores", "Vista Alegre do Prata"] },
  { num: "26", nome: "Uva Vale", crs: "5", macro: "Serra", lx: 335, ly: 114,
    d: "M325 129L330 129L326 118L327 98L337 91L343 96L340 100L342 109L355 119L335 123L341 142L331 151L329 144L332 135L325 133L325 129Z",
    municipios: ["Alto Feliz", "Antônio Prado", "Bom Princípio", "Farroupilha", "Feliz", "Flores da Cunha", "Ipê", "Nova Pádua", "Nova Roma do Sul", "São Marcos", "São Vendelino", "Vale Real"] },
  { num: "27", nome: "Jacuí Centro", crs: "8", macro: "Vales", lx: 247, ly: 194,
    d: "M202 224L207 202L218 202L221 194L240 176L239 172L244 151L230 144L233 142L234 133L231 126L247 126L251 130L251 136L258 140L256 148L247 149L251 170L253 174L260 172L262 178L266 180L262 182L267 201L270 195L272 200L280 200L274 212L279 215L280 220L275 218L274 227L276 230L276 234L264 237L259 233L244 235L248 223L239 215L234 206L232 213L236 221L233 226L223 227L223 237L217 236L213 230L210 231L202 224Z",
    municipios: ["Arroio do Tigre", "Caçapava do Sul", "Cachoeira do Sul", "Cerro Branco", "Encruzilhada do Sul", "Estrela Velha", "Ibarama", "Lagoa Bonita do Sul", "Novo Cabrais", "Passa Sete", "Segredo", "Sobradinho"] },
  { num: "28", nome: "Vinte e Oito", crs: "13", macro: "Vales", lx: 276, ly: 162,
    d: "M246 151L256 148L260 135L266 130L272 132L271 138L278 139L292 147L299 155L301 163L296 160L295 167L297 174L290 177L290 205L286 205L282 198L272 200L270 195L267 201L262 182L266 180L262 178L260 172L253 174L246 151Z",
    municipios: ["Candelária", "Gramado Xavier", "Herveiras", "Mato Leitão", "Pantano Grande", "Passo do Sobrado", "Rio Pardo", "Santa Cruz do Sul", "Sinimbu", "Vale Verde", "Vale do Sol", "Venâncio Aires", "Vera Cruz"] },
  { num: "29", nome: "Vales e Montanhas", crs: "16", macro: "Vales", lx: 297, ly: 126,
    d: "M270 137L276 126L283 127L280 118L286 119L289 110L310 113L313 120L311 133L309 133L310 138L303 139L305 141L300 143L302 145L299 147L300 156L292 147L270 137Z",
    municipios: ["Anta Gorda", "Arroio do Meio", "Boqueirão do Leão", "Canudos do Vale", "Capitão", "Coqueiro Baixo", "Cruzeiro do Sul", "Dois Lajeados", "Doutor Ricardo", "Encantado", "Forquetinha", "Ilópolis", "Lajeado", "Marques de Souza", "Muçum", "Nova Bréscia", "Pouso Novo", "Progresso", "Putinga", "Relvado", "Roca Sales", "Santa Clara do Sul", "São José do Herval", "São Valentim do Sul", "Sério", "Travesseiro", "Vespasiano Corrêa"] },
  { num: "30", nome: "Vale da Luz", crs: "16", macro: "Vales", lx: 308, ly: 149,
    d: "M298 153L302 145L300 143L305 141L303 139L310 138L310 135L314 136L314 143L319 142L317 144L321 145L314 147L317 156L314 154L310 157L309 161L313 161L311 167L313 170L303 166L299 157L301 155L298 153Z",
    municipios: ["Bom Retiro do Sul", "Colinas", "Estrela", "Fazenda Vilanova", "Imigrante", "Paverama", "Poço das Antas", "Taquari", "Teutônia", "Westfália"] },
];

/** Normaliza para comparação: sem acentos, minúsculas, só letras. */
function norm(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Retorna o número da região de saúde de um município (ou null). */
export function regiaoDoMunicipio(municipio?: string | null): string | null {
  if (!municipio) return null;
  const alvo = norm(municipio);
  const r = REGIOES.find(reg => reg.municipios.some(m => norm(m) === alvo));
  return r ? r.num : null;
}

export default function MapaRegioesSaude({
  open, onOpenChange, municipio,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  municipio?: string | null; // município da agenda em regulação (para destacar)
}) {
  const regiaoInicial = useMemo(() => regiaoDoMunicipio(municipio), [municipio]);
  const [selecionada, setSelecionada] = useState<string | null>(regiaoInicial);
  const [abertas, setAbertas] = useState<Set<string>>(new Set(regiaoInicial ? [regiaoInicial] : []));
  const [busca, setBusca] = useState('');

  // Ao abrir a janela (ou trocar de agenda), volta a destacar a região da agenda atual
  useEffect(() => {
    if (open) {
      setSelecionada(regiaoInicial);
      setAbertas(new Set(regiaoInicial ? [regiaoInicial] : []));
      setBusca('');
    }
  }, [open, regiaoInicial]);

  const termo = norm(busca);
  const filtradas = useMemo(() => !termo ? REGIOES : REGIOES.filter(r =>
    norm(`${r.num} ${r.nome} ${r.crs}crs ${r.crs}acrs`).includes(termo) ||
    r.municipios.some(m => norm(m).includes(termo))
  ), [termo]);

  const macros = Object.keys(CORES_MACRO);

  const selecionar = (num: string, alternar: boolean) => {
    setSelecionada(num);
    setAbertas(prev => {
      const next = new Set(prev);
      if (alternar && next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapIcon size={18} className="text-primary" />
            Regiões de saúde do RS
          </DialogTitle>
          <DialogDescription>
            {municipio
              ? (regiaoInicial
                  ? <>Agenda em regulação: <strong>{municipio}</strong> — região {regiaoInicial} destacada.</>
                  : <>Município da agenda (<strong>{municipio}</strong>) não localizado na lista de regiões.</>)
              : 'Clique em uma região no mapa ou busque um município.'}
          </DialogDescription>
        </DialogHeader>

        {/* Mapa — números das regiões de saúde */}
        <svg viewBox={`0 0 ${MAPA_W} ${MAPA_H}`} className="w-full max-w-[460px] mx-auto block" role="img"
          aria-label="Mapa do RS com as 30 regiões de saúde numeradas">
          {REGIOES.map(r => (
            <path key={r.num} d={r.d} fill={CORES_MACRO[r.macro]?.fill ?? '#ddd'}
              stroke={selecionada === r.num ? '#042C53' : '#ffffff'}
              strokeWidth={selecionada === r.num ? 2.5 : 1}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => selecionar(r.num, false)}>
              <title>{`${r.num} · ${r.nome} · ${r.crs}ª CRS`}</title>
            </path>
          ))}
          {/* contorno da selecionada por cima das vizinhas */}
          {selecionada && (() => {
            const r = REGIOES.find(x => x.num === selecionada);
            return r ? <path d={r.d} fill="none" stroke="#042C53" strokeWidth={2.5} pointerEvents="none" /> : null;
          })()}
          {REGIOES.map(r => (
            <text key={`t${r.num}`} x={r.lx} y={r.ly} textAnchor="middle" dominantBaseline="central"
              fontSize={11} fontWeight={600} fill={CORES_MACRO[r.macro]?.text ?? '#333'} pointerEvents="none">
              {Number(r.num)}
            </text>
          ))}
        </svg>

        {/* Legenda das macrorregiões */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {macros.map(m => (
            <span key={m} className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CORES_MACRO[m].fill }} />
              {m}
            </span>
          ))}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar município, região ou CRS"
            className="w-full text-sm pl-8 pr-3 py-1.5 rounded-md border border-border bg-background" />
        </div>

        {/* Lista: macrorregião → região (CRS) → municípios */}
        <div>
          {filtradas.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-2">Nenhuma região encontrada.</p>
          )}
          {macros.map(m => {
            const regs = filtradas.filter(r => r.macro === m);
            if (regs.length === 0) return null;
            return (
              <div key={m} className="mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CORES_MACRO[m].fill }} />
                  Macrorregião {m}
                </div>
                {regs.map(r => {
                  const aberta = !!termo || abertas.has(r.num);
                  return (
                    <div key={r.num} onClick={() => selecionar(r.num, true)}
                      className={`border-t border-border px-2 py-1.5 cursor-pointer text-sm transition-colors ${selecionada === r.num ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-muted/50'}`}>
                      <span className="font-medium text-foreground">{r.num} · {r.nome}</span>
                      <span className="text-muted-foreground"> · {r.crs}ª CRS · {r.municipios.length} municípios</span>
                      {aberta && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {r.municipios.map((mu, i) => {
                            const destaque = (municipio && norm(mu) === norm(municipio)) || (termo && norm(mu).includes(termo));
                            return (
                              <span key={mu}>
                                {i > 0 && ', '}
                                {destaque ? <strong className="text-foreground">{mu}</strong> : mu}
                              </span>
                            );
                          })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
