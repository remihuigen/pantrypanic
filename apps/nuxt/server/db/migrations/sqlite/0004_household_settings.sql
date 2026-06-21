CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `households_name_idx` ON `households` (`name`);
--> statement-breakpoint
CREATE TABLE `household_users` (
	`household_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_users_household_user_idx` ON `household_users` (`household_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `household_users_user_id_idx` ON `household_users` (`user_id`);
--> statement-breakpoint
CREATE TABLE `household_settings` (
	`household_id` text PRIMARY KEY NOT NULL,
	`refresh_interval_ms` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_user_id` integer,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `access_links` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` integer,
	`type` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_links_token_hash_unique` ON `access_links` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `access_links_household_type_idx` ON `access_links` (`household_id`,`type`);
--> statement-breakpoint
CREATE INDEX `access_links_token_hash_idx` ON `access_links` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `access_links_expires_at_idx` ON `access_links` (`expires_at`);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_pathname` text;
--> statement-breakpoint
ALTER TABLE `lists` ADD `household_id` text REFERENCES `households`(`id`);
--> statement-breakpoint
ALTER TABLE `items` ADD `household_id` text REFERENCES `households`(`id`);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `household_id` text REFERENCES `households`(`id`);
--> statement-breakpoint
ALTER TABLE `meal_planner_days` ADD `household_id` text REFERENCES `households`(`id`);
--> statement-breakpoint
ALTER TABLE `recipe_items` ADD `household_id` text REFERENCES `households`(`id`);
--> statement-breakpoint
ALTER TABLE `meal_planner_day_items` ADD `household_id` text REFERENCES `households`(`id`);
--> statement-breakpoint
ALTER TABLE `list_items` ADD `household_id` text REFERENCES `households`(`id`);
--> statement-breakpoint
INSERT INTO `households` (`id`, `name`, `created_at`, `updated_at`)
SELECT
	'019f0000-0000-7000-8000-000000000001',
	'Thuis',
	CAST(strftime('%s', 'now') AS integer) * 1000,
	CAST(strftime('%s', 'now') AS integer) * 1000
WHERE EXISTS (SELECT 1 FROM `users`)
AND NOT EXISTS (SELECT 1 FROM `households`);
--> statement-breakpoint
INSERT INTO `household_users` (`household_id`, `user_id`, `created_at`)
SELECT
	(SELECT `id` FROM `households` ORDER BY `created_at`, `id` LIMIT 1),
	`users`.`id`,
	CAST(strftime('%s', 'now') AS integer) * 1000
FROM `users`
WHERE NOT EXISTS (
	SELECT 1
	FROM `household_users`
	WHERE `household_users`.`user_id` = `users`.`id`
);
--> statement-breakpoint
INSERT INTO `household_settings` (
	`household_id`,
	`refresh_interval_ms`,
	`created_at`,
	`updated_at`,
	`updated_by_user_id`
)
SELECT
	`households`.`id`,
	5000,
	CAST(strftime('%s', 'now') AS integer) * 1000,
	CAST(strftime('%s', 'now') AS integer) * 1000,
	(SELECT `id` FROM `users` ORDER BY `id` LIMIT 1)
FROM `households`
WHERE NOT EXISTS (
	SELECT 1
	FROM `household_settings`
	WHERE `household_settings`.`household_id` = `households`.`id`
);
--> statement-breakpoint
UPDATE `lists`
SET `household_id` = (SELECT `id` FROM `households` ORDER BY `created_at`, `id` LIMIT 1)
WHERE `household_id` IS NULL;
--> statement-breakpoint
UPDATE `items`
SET `household_id` = (SELECT `id` FROM `households` ORDER BY `created_at`, `id` LIMIT 1)
WHERE `household_id` IS NULL;
--> statement-breakpoint
UPDATE `recipes`
SET `household_id` = (SELECT `id` FROM `households` ORDER BY `created_at`, `id` LIMIT 1)
WHERE `household_id` IS NULL;
--> statement-breakpoint
UPDATE `meal_planner_days`
SET `household_id` = (SELECT `id` FROM `households` ORDER BY `created_at`, `id` LIMIT 1)
WHERE `household_id` IS NULL;
--> statement-breakpoint
UPDATE `recipe_items`
SET `household_id` = (
	SELECT `household_id`
	FROM `recipes`
	WHERE `recipes`.`id` = `recipe_items`.`recipe_id`
)
WHERE `household_id` IS NULL;
--> statement-breakpoint
UPDATE `meal_planner_day_items`
SET `household_id` = (
	SELECT `household_id`
	FROM `meal_planner_days`
	WHERE `meal_planner_days`.`id` = `meal_planner_day_items`.`meal_planner_day_id`
)
WHERE `household_id` IS NULL;
--> statement-breakpoint
UPDATE `list_items`
SET `household_id` = (
	SELECT `household_id`
	FROM `lists`
	WHERE `lists`.`id` = `list_items`.`list_id`
)
WHERE `household_id` IS NULL;
--> statement-breakpoint
CREATE INDEX `lists_household_status_position_idx` ON `lists` (`household_id`,`status`,`position`);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_household_normalized_name_idx` ON `items` (`household_id`,`normalized_name`);
--> statement-breakpoint
CREATE INDEX `recipes_household_status_idx` ON `recipes` (`household_id`,`status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `meal_planner_days_household_day_of_week_idx` ON `meal_planner_days` (`household_id`,`day_of_week`);
--> statement-breakpoint
CREATE INDEX `recipe_items_household_id_idx` ON `recipe_items` (`household_id`);
--> statement-breakpoint
CREATE INDEX `meal_planner_day_items_household_id_idx` ON `meal_planner_day_items` (`household_id`);
--> statement-breakpoint
CREATE INDEX `list_items_household_id_idx` ON `list_items` (`household_id`);
