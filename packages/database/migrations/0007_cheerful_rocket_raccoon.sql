CREATE TABLE `otp_codes` (
	`id` varchar(15) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expires` datetime NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `otp_codes_id_unique` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE INDEX `identifier_idx` ON `otp_codes` (`identifier`);--> statement-breakpoint
CREATE INDEX `code_idx` ON `otp_codes` (`code`);--> statement-breakpoint
CREATE INDEX `expires_idx` ON `otp_codes` (`expires`);
