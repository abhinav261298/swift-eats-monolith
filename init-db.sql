-- Swift Eats Database Initialization Script
-- This script creates the database and basic schema

-- Create the database (this is handled by POSTGRES_DB env var)
-- But we can add any additional setup here

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA public;

-- Create basic tables that might be needed
-- Note: TypeORM will handle most table creation via entities

-- You can add any initial data or additional setup here
-- For example:
-- INSERT INTO some_table VALUES (...);

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Swift Eats database initialized successfully!';
END $$;
