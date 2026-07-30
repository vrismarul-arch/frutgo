-- ==========================================================
-- Schema for kithandkin user management backend
-- Run this once against your MySQL database
-- ==========================================================

CREATE TABLE IF NOT EXISTS businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  mobileNumber VARCHAR(10) NOT NULL,
  role ENUM('Admin', 'Manager', 'Editor', 'Viewer') NOT NULL,
  password VARCHAR(255) NOT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  mobileNumber VARCHAR(10) NOT NULL,
  role ENUM('Client Admin', 'Client User') NOT NULL,
  businessAccount ENUM('Individual', 'Business') NOT NULL,
  business VARCHAR(150) NULL,
  password VARCHAR(255) NOT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_clients_business FOREIGN KEY (business) REFERENCES businesses(name)
    ON UPDATE CASCADE ON DELETE SET NULL
);
