ALTER TABLE `accounts` MODIFY COLUMN `userId` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `organization_members` MODIFY COLUMN `userId` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` MODIFY COLUMN `ownerId` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` MODIFY COLUMN `userId` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `space_members` MODIFY COLUMN `userId` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `preferences` json;--> statement-breakpoint
ALTER TABLE `videos` MODIFY COLUMN `ownerId` varchar(50) NOT NULL;