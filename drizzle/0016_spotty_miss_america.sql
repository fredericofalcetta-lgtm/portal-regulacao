CREATE TABLE `sem_cotas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`especialidade` varchar(255),
	`municipio` varchar(255),
	`aguardando` int,
	`autorizados` int,
	`central` varchar(100),
	`is_nova` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sem_cotas_id` PRIMARY KEY(`id`)
);
