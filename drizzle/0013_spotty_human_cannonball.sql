ALTER TABLE `regulacao_data` ADD `flag_index` text;--> statement-breakpoint
ALTER TABLE `regulacao_data` ADD `cor_index` varchar(100);--> statement-breakpoint
ALTER TABLE `regulacao_data` ADD `flag_aut_cotas` text;--> statement-breakpoint
ALTER TABLE `regulacao_data` ADD `cor_aut_cotas` varchar(100);--> statement-breakpoint
ALTER TABLE `regulacao_data` DROP COLUMN `flags`;--> statement-breakpoint
ALTER TABLE `regulacao_data` DROP COLUMN `cor`;