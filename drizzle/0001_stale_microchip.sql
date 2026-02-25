CREATE TABLE `account_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `magic_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `magic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `magic_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `nicoka_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataType` enum('quotations','orders','opportunities') NOT NULL,
	`year` int NOT NULL,
	`data` json NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nicoka_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunity_status_weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`statusId` varchar(64) NOT NULL,
	`statusLabel` varchar(255) NOT NULL,
	`weight` decimal(5,2) NOT NULL DEFAULT '0.30',
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunity_status_weights_id` PRIMARY KEY(`id`),
	CONSTRAINT `opportunity_status_weights_statusId_unique` UNIQUE(`statusId`)
);
--> statement-breakpoint
CREATE TABLE `quotation_status_weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`statusId` varchar(64) NOT NULL,
	`statusLabel` varchar(255) NOT NULL,
	`weight` decimal(5,2) NOT NULL DEFAULT '0.50',
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_status_weights_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotation_status_weights_statusId_unique` UNIQUE(`statusId`)
);
--> statement-breakpoint
CREATE TABLE `simulation_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`year` int NOT NULL,
	`createdBy` int,
	`quotationWeightsOverride` json,
	`opportunityWeightsOverride` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simulation_scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `approved` boolean DEFAULT false NOT NULL;