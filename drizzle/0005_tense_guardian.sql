CREATE TABLE `check_ins` (
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `check_ins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encaminhamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenda_id` int NOT NULL,
	`agenda_nome` varchar(255) NOT NULL,
	`especialidade` varchar(255) NOT NULL,
	`regulador_email` varchar(320) NOT NULL,
	`regulador_nome` varchar(255) NOT NULL,
	`encaminhado_por_email` varchar(320) NOT NULL,
	`encaminhado_por_nome` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `encaminhamentos_id` PRIMARY KEY(`id`)
);
