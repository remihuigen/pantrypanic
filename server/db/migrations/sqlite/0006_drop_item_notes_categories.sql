DROP INDEX IF EXISTS `items_category_idx`;--> statement-breakpoint
ALTER TABLE `items` DROP COLUMN `category`;--> statement-breakpoint
ALTER TABLE `items` DROP COLUMN `notes`;
