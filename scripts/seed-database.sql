-- Swift Eats Database Seeding Script
-- Populates all tables with realistic data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clear existing data (in correct order due to foreign keys)
TRUNCATE TABLE menu_items, restaurants, users, orders, payments CASCADE;

-- Insert realistic users
INSERT INTO users (id, email, password, first_name, last_name, phone, address, city, latitude, longitude, is_active, role, created_at, updated_at) VALUES
(uuid_generate_v4(), 'john.doe@email.com', '$2b$10$rOzJqQZ8kVx8yF2nF3nF3uF3nF3nF3nF3nF3nF3nF3nF3nF3nF3nF3', 'John', 'Doe', '+919876543210', '123 MG Road, Bandra', 'Mumbai', 19.0596, 72.8295, true, 'customer', NOW(), NOW()),
(uuid_generate_v4(), 'jane.smith@email.com', '$2b$10$rOzJqQZ8kVx8yF2nF3nF3uF3nF3nF3nF3nF3nF3nF3nF3nF3nF3nF3', 'Jane', 'Smith', '+919876543211', '456 Carter Road, Bandra', 'Mumbai', 19.0728, 72.8194, true, 'customer', NOW(), NOW()),
(uuid_generate_v4(), 'raj.patel@email.com', '$2b$10$rOzJqQZ8kVx8yF2nF3nF3uF3nF3nF3nF3nF3nF3nF3nF3nF3nF3nF3', 'Raj', 'Patel', '+919876543212', '789 Linking Road, Bandra', 'Mumbai', 19.0544, 72.8266, true, 'restaurant_owner', NOW(), NOW()),
(uuid_generate_v4(), 'priya.sharma@email.com', '$2b$10$rOzJqQZ8kVx8yF2nF3nF3uF3nF3nF3nF3nF3nF3nF3nF3nF3nF3nF3', 'Priya', 'Sharma', '+919876543213', '321 Hill Road, Bandra', 'Mumbai', 19.0625, 72.8347, true, 'customer', NOW(), NOW()),
(uuid_generate_v4(), 'amit.kumar@email.com', '$2b$10$rOzJqQZ8kVx8yF2nF3nF3uF3nF3nF3nF3nF3nF3nF3nF3nF3nF3nF3', 'Amit', 'Kumar', '+919876543214', '654 SV Road, Andheri', 'Mumbai', 19.1136, 72.8697, true, 'delivery_partner', NOW(), NOW());

-- Insert realistic restaurants with proper UUIDs
INSERT INTO restaurants (id, name, description, address, city, latitude, longitude, phone, email, owner_id, is_active, rating, total_reviews, cuisine_types, opening_time, closing_time, created_at, updated_at) VALUES
(uuid_generate_v4(), 'Spice Garden', 'Authentic Indian cuisine with traditional recipes', '12 Turner Road, Bandra West', 'Mumbai', 19.0596, 72.8295, '+912226431234', 'info@spicegarden.com', (SELECT id FROM users WHERE email = 'raj.patel@email.com'), true, 4.5, 150, ARRAY['Indian', 'Vegetarian', 'North Indian'], '11:00', '23:00', NOW(), NOW()),
(uuid_generate_v4(), 'Pizza Corner', 'Wood-fired pizzas and Italian delights', '45 Hill Road, Bandra West', 'Mumbai', 19.0625, 72.8347, '+912226431235', 'hello@pizzacorner.com', (SELECT id FROM users WHERE email = 'raj.patel@email.com'), true, 4.2, 89, ARRAY['Italian', 'Pizza', 'Fast Food'], '12:00', '01:00', NOW(), NOW()),
(uuid_generate_v4(), 'Burger Junction', 'Gourmet burgers and American classics', '78 Linking Road, Bandra West', 'Mumbai', 19.0544, 72.8266, '+912226431236', 'orders@burgerjunction.com', (SELECT id FROM users WHERE email = 'raj.patel@email.com'), true, 4.0, 67, ARRAY['American', 'Burgers', 'Fast Food'], '11:30', '00:30', NOW(), NOW()),
(uuid_generate_v4(), 'Sushi Zen', 'Fresh sushi and Japanese cuisine', '23 Carter Road, Bandra West', 'Mumbai', 19.0728, 72.8194, '+912226431237', 'contact@sushizen.com', (SELECT id FROM users WHERE email = 'raj.patel@email.com'), true, 4.7, 203, ARRAY['Japanese', 'Sushi', 'Asian'], '18:00', '23:30', NOW(), NOW()),
(uuid_generate_v4(), 'Cafe Mocha', 'Coffee, pastries and light bites', '56 SV Road, Andheri West', 'Mumbai', 19.1136, 72.8697, '+912226431238', 'info@cafemocha.com', (SELECT id FROM users WHERE email = 'raj.patel@email.com'), true, 4.3, 124, ARRAY['Cafe', 'Coffee', 'Desserts'], '07:00', '22:00', NOW(), NOW());

-- Insert menu items for each restaurant
-- Spice Garden menu
INSERT INTO menu_items (id, restaurant_id, name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url, created_at, updated_at) 
SELECT 
    uuid_generate_v4(), 
    r.id, 
    item.name, 
    item.description, 
    item.price, 
    item.category, 
    item.is_available, 
    item.is_vegetarian, 
    item.spice_level, 
    item.preparation_time, 
    item.image_url,
    NOW(), 
    NOW()
FROM restaurants r
CROSS JOIN (VALUES
    ('Butter Chicken', 'Creamy tomato-based curry with tender chicken', 350.00, 'Main Course', true, false, 'medium', 25, 'https://example.com/butter-chicken.jpg'),
    ('Paneer Tikka Masala', 'Grilled cottage cheese in rich spiced gravy', 320.00, 'Main Course', true, true, 'medium', 20, 'https://example.com/paneer-tikka.jpg'),
    ('Dal Makhani', 'Slow-cooked black lentils with butter and cream', 280.00, 'Main Course', true, true, 'mild', 30, 'https://example.com/dal-makhani.jpg'),
    ('Garlic Naan', 'Fresh baked bread with garlic and herbs', 80.00, 'Bread', true, true, 'mild', 10, 'https://example.com/garlic-naan.jpg'),
    ('Basmati Rice', 'Fragrant long-grain rice', 120.00, 'Rice', true, true, 'mild', 15, 'https://example.com/basmati-rice.jpg'),
    ('Gulab Jamun', 'Sweet milk dumplings in sugar syrup', 150.00, 'Dessert', true, true, 'mild', 5, 'https://example.com/gulab-jamun.jpg')
) AS item(name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url)
WHERE r.name = 'Spice Garden';

-- Pizza Corner menu
INSERT INTO menu_items (id, restaurant_id, name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url, created_at, updated_at) 
SELECT 
    uuid_generate_v4(), 
    r.id, 
    item.name, 
    item.description, 
    item.price, 
    item.category, 
    item.is_available, 
    item.is_vegetarian, 
    item.spice_level, 
    item.preparation_time, 
    item.image_url,
    NOW(), 
    NOW()
FROM restaurants r
CROSS JOIN (VALUES
    ('Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella and basil', 450.00, 'Pizza', true, true, 'mild', 18, 'https://example.com/margherita.jpg'),
    ('Pepperoni Pizza', 'Spicy pepperoni with mozzarella cheese', 550.00, 'Pizza', true, false, 'medium', 20, 'https://example.com/pepperoni.jpg'),
    ('Chicken BBQ Pizza', 'BBQ chicken with onions and bell peppers', 620.00, 'Pizza', true, false, 'medium', 22, 'https://example.com/bbq-chicken.jpg'),
    ('Garlic Bread', 'Crispy bread with garlic butter', 180.00, 'Appetizer', true, true, 'mild', 12, 'https://example.com/garlic-bread.jpg'),
    ('Caesar Salad', 'Fresh romaine lettuce with caesar dressing', 320.00, 'Salad', true, true, 'mild', 10, 'https://example.com/caesar-salad.jpg'),
    ('Tiramisu', 'Classic Italian coffee-flavored dessert', 280.00, 'Dessert', true, true, 'mild', 5, 'https://example.com/tiramisu.jpg')
) AS item(name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url)
WHERE r.name = 'Pizza Corner';

-- Burger Junction menu
INSERT INTO menu_items (id, restaurant_id, name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url, created_at, updated_at) 
SELECT 
    uuid_generate_v4(), 
    r.id, 
    item.name, 
    item.description, 
    item.price, 
    item.category, 
    item.is_available, 
    item.is_vegetarian, 
    item.spice_level, 
    item.preparation_time, 
    item.image_url,
    NOW(), 
    NOW()
FROM restaurants r
CROSS JOIN (VALUES
    ('Classic Beef Burger', 'Juicy beef patty with lettuce, tomato and cheese', 380.00, 'Burger', true, false, 'mild', 15, 'https://example.com/beef-burger.jpg'),
    ('Chicken Deluxe Burger', 'Grilled chicken with avocado and bacon', 420.00, 'Burger', true, false, 'mild', 18, 'https://example.com/chicken-burger.jpg'),
    ('Veggie Burger', 'Plant-based patty with fresh vegetables', 350.00, 'Burger', true, true, 'mild', 15, 'https://example.com/veggie-burger.jpg'),
    ('Loaded Fries', 'Crispy fries with cheese, bacon and sour cream', 250.00, 'Sides', true, false, 'mild', 12, 'https://example.com/loaded-fries.jpg'),
    ('Onion Rings', 'Golden crispy onion rings', 180.00, 'Sides', true, true, 'mild', 10, 'https://example.com/onion-rings.jpg'),
    ('Chocolate Shake', 'Rich chocolate milkshake', 220.00, 'Beverage', true, true, 'mild', 5, 'https://example.com/chocolate-shake.jpg')
) AS item(name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url)
WHERE r.name = 'Burger Junction';

-- Sushi Zen menu
INSERT INTO menu_items (id, restaurant_id, name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url, created_at, updated_at) 
SELECT 
    uuid_generate_v4(), 
    r.id, 
    item.name, 
    item.description, 
    item.price, 
    item.category, 
    item.is_available, 
    item.is_vegetarian, 
    item.spice_level, 
    item.preparation_time, 
    item.image_url,
    NOW(), 
    NOW()
FROM restaurants r
CROSS JOIN (VALUES
    ('Salmon Sashimi', 'Fresh salmon slices, 6 pieces', 680.00, 'Sashimi', true, false, 'mild', 8, 'https://example.com/salmon-sashimi.jpg'),
    ('California Roll', 'Crab, avocado and cucumber roll, 8 pieces', 520.00, 'Sushi Roll', true, false, 'mild', 12, 'https://example.com/california-roll.jpg'),
    ('Vegetable Tempura', 'Crispy battered vegetables', 380.00, 'Tempura', true, true, 'mild', 15, 'https://example.com/veg-tempura.jpg'),
    ('Miso Soup', 'Traditional soybean paste soup', 180.00, 'Soup', true, true, 'mild', 8, 'https://example.com/miso-soup.jpg'),
    ('Chicken Teriyaki', 'Grilled chicken with teriyaki glaze', 480.00, 'Main Course', true, false, 'mild', 20, 'https://example.com/chicken-teriyaki.jpg'),
    ('Green Tea Ice Cream', 'Traditional Japanese dessert', 220.00, 'Dessert', true, true, 'mild', 3, 'https://example.com/green-tea-ice-cream.jpg')
) AS item(name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url)
WHERE r.name = 'Sushi Zen';

-- Cafe Mocha menu
INSERT INTO menu_items (id, restaurant_id, name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url, created_at, updated_at) 
SELECT 
    uuid_generate_v4(), 
    r.id, 
    item.name, 
    item.description, 
    item.price, 
    item.category, 
    item.is_available, 
    item.is_vegetarian, 
    item.spice_level, 
    item.preparation_time, 
    item.image_url,
    NOW(), 
    NOW()
FROM restaurants r
CROSS JOIN (VALUES
    ('Cappuccino', 'Rich espresso with steamed milk foam', 180.00, 'Coffee', true, true, 'mild', 5, 'https://example.com/cappuccino.jpg'),
    ('Latte', 'Smooth espresso with steamed milk', 200.00, 'Coffee', true, true, 'mild', 5, 'https://example.com/latte.jpg'),
    ('Chocolate Croissant', 'Buttery pastry with chocolate filling', 150.00, 'Pastry', true, true, 'mild', 3, 'https://example.com/choc-croissant.jpg'),
    ('Blueberry Muffin', 'Fresh baked muffin with blueberries', 120.00, 'Pastry', true, true, 'mild', 3, 'https://example.com/blueberry-muffin.jpg'),
    ('Grilled Sandwich', 'Toasted sandwich with cheese and vegetables', 280.00, 'Sandwich', true, true, 'mild', 10, 'https://example.com/grilled-sandwich.jpg'),
    ('Cheesecake', 'Creamy New York style cheesecake', 320.00, 'Dessert', true, true, 'mild', 5, 'https://example.com/cheesecake.jpg')
) AS item(name, description, price, category, is_available, is_vegetarian, spice_level, preparation_time, image_url)
WHERE r.name = 'Cafe Mocha';


-- Log successful seeding
DO $$
BEGIN
    RAISE NOTICE 'Swift Eats database seeded successfully with realistic data!';
END $$;
