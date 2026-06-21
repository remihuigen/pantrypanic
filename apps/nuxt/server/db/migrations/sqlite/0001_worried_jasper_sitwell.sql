CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`default_unit` text,
	`category` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_normalized_name_idx` ON `items` (`normalized_name`);--> statement-breakpoint
CREATE INDEX `items_name_idx` ON `items` (`name`);--> statement-breakpoint
CREATE INDEX `items_category_idx` ON `items` (`category`);--> statement-breakpoint
CREATE TABLE `list_items` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`item_id` text NOT NULL,
	`status` text NOT NULL,
	`position` integer NOT NULL,
	`label` text,
	`amount` real,
	`unit` text,
	`note` text,
	`source_type` text NOT NULL,
	`source_recipe_id` text,
	`source_meal_planner_day_id` text,
	`checked_at` integer,
	`checked_by_user_id` integer,
	`archived_at` integer,
	`archived_by_user_id` integer,
	`deleted_at` integer,
	`deleted_by_user_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_meal_planner_day_id`) REFERENCES `meal_planner_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checked_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`archived_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deleted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `list_items_list_id_status_position_idx` ON `list_items` (`list_id`,`status`,`position`);--> statement-breakpoint
CREATE INDEX `list_items_item_id_idx` ON `list_items` (`item_id`);--> statement-breakpoint
CREATE INDEX `list_items_status_idx` ON `list_items` (`status`);--> statement-breakpoint
CREATE INDEX `list_items_archived_at_idx` ON `list_items` (`archived_at`);--> statement-breakpoint
CREATE INDEX `list_items_source_recipe_id_idx` ON `list_items` (`source_recipe_id`);--> statement-breakpoint
CREATE INDEX `list_items_source_meal_planner_day_id_idx` ON `list_items` (`source_meal_planner_day_id`);--> statement-breakpoint
CREATE INDEX `list_items_created_by_user_id_idx` ON `list_items` (`created_by_user_id`);--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`position` integer NOT NULL,
	`archived_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lists_status_position_idx` ON `lists` (`status`,`position`);--> statement-breakpoint
CREATE INDEX `lists_created_by_user_id_idx` ON `lists` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `lists_updated_by_user_id_idx` ON `lists` (`updated_by_user_id`);--> statement-breakpoint
CREATE TABLE `meal_planner_day_items` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_planner_day_id` text NOT NULL,
	`item_id` text NOT NULL,
	`label` text,
	`amount` real,
	`unit` text,
	`note` text,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`meal_planner_day_id`) REFERENCES `meal_planner_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `meal_planner_day_items_day_id_position_idx` ON `meal_planner_day_items` (`meal_planner_day_id`,`position`);--> statement-breakpoint
CREATE INDEX `meal_planner_day_items_item_id_idx` ON `meal_planner_day_items` (`item_id`);--> statement-breakpoint
CREATE TABLE `meal_planner_days` (
	`id` text PRIMARY KEY NOT NULL,
	`day_of_week` integer NOT NULL,
	`type` text NOT NULL,
	`recipe_id` text,
	`placeholder_name` text,
	`placeholder_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meal_planner_days_day_of_week_idx` ON `meal_planner_days` (`day_of_week`);--> statement-breakpoint
CREATE INDEX `meal_planner_days_type_idx` ON `meal_planner_days` (`type`);--> statement-breakpoint
CREATE INDEX `meal_planner_days_recipe_id_idx` ON `meal_planner_days` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipe_items` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`item_id` text NOT NULL,
	`label` text,
	`amount` real,
	`unit` text,
	`note` text,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipe_items_recipe_id_position_idx` ON `recipe_items` (`recipe_id`,`position`);--> statement-breakpoint
CREATE INDEX `recipe_items_item_id_idx` ON `recipe_items` (`item_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`servings` integer,
	`source_url` text,
	`notes` text,
	`status` text NOT NULL,
	`archived_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipes_status_idx` ON `recipes` (`status`);--> statement-breakpoint
CREATE INDEX `recipes_name_idx` ON `recipes` (`name`);--> statement-breakpoint
CREATE INDEX `recipes_created_by_user_id_idx` ON `recipes` (`created_by_user_id`);--> statement-breakpoint
INSERT INTO `lists` (
	`id`,
	`name`,
	`status`,
	`position`,
	`archived_at`,
	`deleted_at`,
	`created_at`,
	`updated_at`,
	`created_by_user_id`,
	`updated_by_user_id`
)
SELECT
	'019eb066-6890-7bd9-b928-3e8615df692e',
	'Groceries',
	'active',
	0,
	NULL,
	NULL,
	CAST(strftime('%s', 'now') AS integer) * 1000,
	CAST(strftime('%s', 'now') AS integer) * 1000,
	`users`.`id`,
	`users`.`id`
FROM `users`
WHERE NOT EXISTS (
	SELECT 1 FROM `lists` WHERE `name` = 'Groceries'
)
ORDER BY `users`.`id`
LIMIT 1;--> statement-breakpoint
WITH `audit_user` AS (
	SELECT `id` FROM `users` ORDER BY `id` LIMIT 1
),
`seed_days`(`id`, `day_of_week`) AS (
	VALUES
		('019eb066-6893-754f-b3ea-1fa474247f01', 1),
		('019eb066-6894-7417-a194-e546e630b881', 2),
		('019eb066-6895-7983-b5ac-276a9228c7ce', 3),
		('019eb066-6896-7b85-9dc3-75dae8981791', 4),
		('019eb066-6897-7059-ba73-95258ca21a43', 5),
		('019eb066-6898-775a-b63d-ea9ba5283140', 6),
		('019eb066-6899-7838-b5aa-e7c668342499', 7)
)
INSERT INTO `meal_planner_days` (
	`id`,
	`day_of_week`,
	`type`,
	`recipe_id`,
	`placeholder_name`,
	`placeholder_notes`,
	`created_at`,
	`updated_at`,
	`created_by_user_id`,
	`updated_by_user_id`
)
SELECT
	`seed_days`.`id`,
	`seed_days`.`day_of_week`,
	'empty',
	NULL,
	NULL,
	NULL,
	CAST(strftime('%s', 'now') AS integer) * 1000,
	CAST(strftime('%s', 'now') AS integer) * 1000,
	`audit_user`.`id`,
	`audit_user`.`id`
FROM `seed_days`
CROSS JOIN `audit_user`
WHERE NOT EXISTS (
	SELECT 1
	FROM `meal_planner_days`
	WHERE `meal_planner_days`.`day_of_week` = `seed_days`.`day_of_week`
);
