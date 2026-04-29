ALTER TABLE `agendas_relacionadas_config` DROP INDEX `agendas_relacionadas_config_agenda_id_unique`;--> statement-breakpoint
ALTER TABLE `agendas_relacionadas_config` ADD `relacionadas_nomes` text DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `agendas_relacionadas_config` ADD CONSTRAINT `agendas_relacionadas_config_agenda_nome_unique` UNIQUE(`agenda_nome`);--> statement-breakpoint
ALTER TABLE `agendas_relacionadas_config` DROP COLUMN `agenda_id`;--> statement-breakpoint
ALTER TABLE `agendas_relacionadas_config` DROP COLUMN `municipio`;--> statement-breakpoint
ALTER TABLE `agendas_relacionadas_config` DROP COLUMN `central`;--> statement-breakpoint
ALTER TABLE `agendas_relacionadas_config` DROP COLUMN `relacionadas_ids`;