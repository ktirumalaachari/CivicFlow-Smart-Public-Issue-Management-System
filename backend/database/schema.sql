-- ==========================================================
-- CIVICFLOW - SMART PUBLIC ISSUE MANAGEMENT SYSTEM
-- DATABASE SCHEMA & INITIAL SEEDING
-- FOR MYSQL 8.0+
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `civicflow`;
USE `defaultdb`;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('Citizen', 'Officer', 'Administrator') NOT NULL DEFAULT 'Citizen',
  `department` VARCHAR(100) DEFAULT NULL, -- Primarily for Officers
  `avatar` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS `complaints` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tracking_id` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('Road', 'Water', 'Electricity', 'Sanitation', 'Waste', 'Traffic', 'Health', 'Other') NOT NULL,
  `priority` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  `location_lat` DECIMAL(10, 8) DEFAULT NULL,
  `location_lng` DECIMAL(11, 8) DEFAULT NULL,
  `location_name` VARCHAR(255) DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('Submitted', 'Assigned', 'In Progress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Submitted',
  `citizen_id` INT NOT NULL,
  `officer_id` INT DEFAULT NULL,
  `resolution_notes` TEXT DEFAULT NULL,
  `resolution_image` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`citizen_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`officer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- SYSTEM SEED DATA (Password for accounts is 'password123' hashed)
-- ==========================================================

-- Seed Administrators
INSERT INTO `users` (`name`, `email`, `password`, `phone`, `role`) 
VALUES 
('System Admin', 'admin@civicflow.com', '$2a$10$tZre5DymF9p8G7BqH87WkueH5v0t2pIomIeYV696gE09bQv15K0Oq', '9876543210', 'Administrator')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Officers
INSERT INTO `users` (`name`, `email`, `password`, `phone`, `role`, `department`) 
VALUES 
('Officer Rajesh', 'officer.water@civicflow.com', '$2a$10$tZre5DymF9p8G7BqH87WkueH5v0t2pIomIeYV696gE09bQv15K0Oq', '9876543211', 'Officer', 'Water'),
('Officer Priya', 'officer.road@civicflow.com', '$2a$10$tZre5DymF9p8G7BqH87WkueH5v0t2pIomIeYV696gE09bQv15K0Oq', '9876543212', 'Officer', 'Road'),
('Officer Vikram', 'officer.waste@civicflow.com', '$2a$10$tZre5DymF9p8G7BqH87WkueH5v0t2pIomIeYV696gE09bQv15K0Oq', '9876543213', 'Officer', 'Waste'),
('Officer Amit', 'officer.electricity@civicflow.com', '$2a$10$tZre5DymF9p8G7BqH87WkueH5v0t2pIomIeYV696gE09bQv15K0Oq', '9876543214', 'Officer', 'Electricity')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Citizens
INSERT INTO `users` (`name`, `email`, `password`, `phone`, `role`) 
VALUES 
('Anil Kumar', 'citizen@civicflow.com', '$2a$10$tZre5DymF9p8G7BqH87WkueH5v0t2pIomIeYV696gE09bQv15K0Oq', '9876543215', 'Citizen')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Sample Complaints
INSERT INTO `complaints` (`tracking_id`, `title`, `description`, `category`, `priority`, `location_lat`, `location_lng`, `location_name`, `status`, `citizen_id`, `officer_id`)
VALUES
('CF-2026-000101', 'Severe Water Leakage', 'Main pipeline has burst near Maple Street, causing water logging and low pressure in residential areas.', 'Water', 'High', 12.9716, 77.5946, 'Maple Street Crossing, Sector 4', 'In Progress', 6, 2),
('CF-2026-000102', 'Damaged Pothole on Highway', 'Large, dangerous pothole right in the middle of the dual-carriageway. Needs urgent patching as it poses severe risk.', 'Road', 'Critical', 12.9740, 77.6010, 'Outer Ring Road, Block B', 'Assigned', 6, 3),
('CF-2026-000103', 'Streetlights Flickering and Offline', 'Several streetlights are completely out, creating safety issues for pedestrian traffic after dark.', 'Electricity', 'Medium', 12.9650, 77.5890, 'Victoria Lane', 'Resolved', 6, 5),
('CF-2026-000104', 'Overflowing Garbage Bin', 'Public garbage dump has not been cleared for three days. Foul smell and stray dogs gathered.', 'Waste', 'Medium', 12.9800, 77.6200, 'Greenpark Avenue Market', 'Submitted', 6, NULL)
ON DUPLICATE KEY UPDATE `id`=`id`;
