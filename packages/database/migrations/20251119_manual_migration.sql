-- Create notifications table
CREATE TABLE `notifications` (
	`id` varchar(15) NOT NULL,
	`orgId` varchar(15) NOT NULL,
	`recipientId` varchar(15) NOT NULL,
	`type` varchar(10) NOT NULL,
	`data` json NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_id_unique` UNIQUE(`id`)
);

-- Create indexes for notifications table
CREATE INDEX `recipient_id_idx` ON `notifications` (`recipientId`);
CREATE INDEX `org_id_idx` ON `notifications` (`orgId`);
CREATE INDEX `type_idx` ON `notifications` (`type`);
CREATE INDEX `read_at_idx` ON `notifications` (`readAt`);
CREATE INDEX `created_at_idx` ON `notifications` (`createdAt`);
CREATE INDEX `recipient_read_idx` ON `notifications` (`recipientId`, `readAt`);
CREATE INDEX `recipient_created_idx` ON `notifications` (`recipientId`, `createdAt`);

