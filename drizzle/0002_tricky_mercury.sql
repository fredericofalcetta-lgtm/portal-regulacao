CREATE TABLE `prioridades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grande_grupo` varchar(255),
	`nome_arquivo` varchar(500),
	`link_url` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prioridades_id` PRIMARY KEY(`id`)
);
