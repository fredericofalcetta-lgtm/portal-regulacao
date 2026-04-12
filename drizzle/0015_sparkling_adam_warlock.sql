CREATE TABLE `agendas_relacionadas_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenda_id` int NOT NULL,
	`agenda_nome` varchar(255) NOT NULL,
	`municipio` varchar(255),
	`central` varchar(100),
	`especialidade` varchar(255),
	`relacionadas_ids` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agendas_relacionadas_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `agendas_relacionadas_config_agenda_id_unique` UNIQUE(`agenda_id`)
);
