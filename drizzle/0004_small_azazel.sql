CREATE TABLE `protocolos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(500) NOT NULL,
	`link_url` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocolos_id` PRIMARY KEY(`id`)
);
