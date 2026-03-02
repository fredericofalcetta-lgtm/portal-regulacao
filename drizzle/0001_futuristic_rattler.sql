CREATE TABLE `regulacao_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenda` varchar(255),
	`municipio` varchar(255),
	`cotas` int,
	`saldo` int,
	`aguardando` int,
	`autorizadas` int,
	`aut_cotas` varchar(50),
	`index_regula` double,
	`central` varchar(100),
	`especialidade` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regulacao_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`synced_at` timestamp NOT NULL DEFAULT (now()),
	`row_count` int,
	`status` varchar(50) DEFAULT 'success',
	`message` text,
	CONSTRAINT `sync_log_id` PRIMARY KEY(`id`)
);
