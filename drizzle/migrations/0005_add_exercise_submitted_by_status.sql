ALTER TABLE `exercises` ADD COLUMN `submitted_by` text;
ALTER TABLE `exercises` ADD COLUMN `status` text NOT NULL DEFAULT 'approved';
