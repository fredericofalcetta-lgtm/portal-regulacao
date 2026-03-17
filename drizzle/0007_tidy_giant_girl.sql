CREATE TABLE `agendas_concluidas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenda_id` int NOT NULL,
	`agenda_nome` varchar(255) NOT NULL,
	`municipio` varchar(255),
	`especialidade` varchar(255) NOT NULL,
	`central` varchar(100),
	`cotas` int,
	`saldo` int,
	`aguardando` int,
	`index_regula` double,
	`usuario_email` varchar(320) NOT NULL,
	`usuario_nome` varchar(255) NOT NULL,
	`concluido_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agendas_concluidas_id` PRIMARY KEY(`id`)
);
