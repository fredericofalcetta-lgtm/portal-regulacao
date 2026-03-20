CREATE TABLE `dicionario_especialidades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenda` varchar(255) NOT NULL,
	`especialidade` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dicionario_especialidades_id` PRIMARY KEY(`id`)
);
