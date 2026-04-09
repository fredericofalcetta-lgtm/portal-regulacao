CREATE TABLE `agendas_favoritas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`regulador_email` varchar(320) NOT NULL,
	`agenda_id` int NOT NULL,
	`agenda_nome` varchar(255) NOT NULL,
	`municipio` varchar(255),
	`central` varchar(100),
	`especialidade` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agendas_favoritas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regulador_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`regulador_email` varchar(320) NOT NULL,
	`especialidades` text,
	`agendas_filtro` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regulador_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `regulador_config_regulador_email_unique` UNIQUE(`regulador_email`)
);
