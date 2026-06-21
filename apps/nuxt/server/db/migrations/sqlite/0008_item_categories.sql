CREATE TABLE `item_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_categories_household_normalized_name_idx` ON `item_categories` (`household_id`,`normalized_name`);
--> statement-breakpoint
CREATE INDEX `item_categories_name_idx` ON `item_categories` (`name`);
--> statement-breakpoint
CREATE INDEX `item_categories_household_id_idx` ON `item_categories` (`household_id`);
--> statement-breakpoint
CREATE TABLE `list_category_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`list_id` text NOT NULL,
	`category_id` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`updated_by_user_id` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `item_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `list_category_positions_list_category_idx` ON `list_category_positions` (`list_id`,`category_id`);
--> statement-breakpoint
CREATE INDEX `list_category_positions_list_position_idx` ON `list_category_positions` (`list_id`,`position`);
--> statement-breakpoint
CREATE INDEX `list_category_positions_category_id_idx` ON `list_category_positions` (`category_id`);
--> statement-breakpoint
CREATE INDEX `list_category_positions_household_id_idx` ON `list_category_positions` (`household_id`);
--> statement-breakpoint
ALTER TABLE `items` ADD `category_id` text REFERENCES `item_categories`(`id`);
--> statement-breakpoint
CREATE INDEX `items_category_id_idx` ON `items` (`category_id`);
--> statement-breakpoint
ALTER TABLE `list_items` ADD `category_id` text REFERENCES `item_categories`(`id`);
--> statement-breakpoint
CREATE INDEX `list_items_category_id_idx` ON `list_items` (`category_id`);
