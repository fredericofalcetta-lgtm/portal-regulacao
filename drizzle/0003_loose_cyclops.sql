CREATE TABLE `reguladores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`vinculo` varchar(100),
	`perfil` varchar(100),
	`grande_grupo` text,
	`agendas` text,
	`email` varchar(320) NOT NULL,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reguladores_id` PRIMARY KEY(`id`),
	CONSTRAINT `reguladores_email_unique` UNIQUE(`email`)
);
