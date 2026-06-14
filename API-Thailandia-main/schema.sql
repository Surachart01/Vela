-- schema.sql
-- Connect to the agent_operator database
\c agent_operator

-- Create UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100) UNIQUE NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    currency_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS hotels (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Thailand',
    notes TEXT,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS hotel_contacts (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    telephone VARCHAR(20),
    fax VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (hotel_id, email)
);

CREATE TABLE IF NOT EXISTS hotel_fees (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    late_checkout_fee INTEGER CHECK (late_checkout_fee >= 0 AND late_checkout_fee <= 100) DEFAULT 0,
    early_checkin_fee INTEGER CHECK (early_checkin_fee >= 0 AND early_checkin_fee <= 100) DEFAULT 0,
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    christmas_dinner_fee DECIMAL(10, 2),
    new_year_dinner_fee DECIMAL(10, 2),
    late_checkout_21_fee INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_types (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    allotment INTEGER DEFAULT 0,
    single_price DECIMAL(10, 2),
    double_price DECIMAL(10, 2),
    extra_bed_adult DECIMAL(10, 2),
    extra_bed_child DECIMAL(10, 2),
    extra_bed_shared DECIMAL(10, 2),
    food_adult_abf DECIMAL(10, 2),
    food_adult_lunch DECIMAL(10, 2),
    food_adult_dinner DECIMAL(10, 2),
    food_child_abf DECIMAL(10, 2),
    food_child_lunch DECIMAL(10, 2),
    food_child_dinner DECIMAL(10, 2),
    boarding_half_price DECIMAL(10, 2),
    boarding_full_price DECIMAL(10, 2),
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotel_promotions (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    promotion_code VARCHAR(50) NOT NULL,
    booking_date_from DATE,
    booking_date_to DATE,
    travel_date_from DATE,
    travel_date_to DATE,
    is_early_bird BOOLEAN DEFAULT FALSE,
    early_bird_days INTEGER,
    description TEXT,
    minimum_nights INTEGER,
    enabled BOOLEAN DEFAULT TRUE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('%', 'Amount')),
    valid_for_extra_beds BOOLEAN DEFAULT FALSE,
    combinable BOOLEAN DEFAULT TRUE,
    free_meals_abf INTEGER DEFAULT 0,
    free_meals_lunch INTEGER DEFAULT 0,
    free_meals_dinner INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (hotel_id, discount_amount, discount_type)
);

CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    markup_group VARCHAR(20) NOT NULL,
    address TEXT,
    email VARCHAR(100) UNIQUE NOT NULL,
    telephone VARCHAR(20),
    fax VARCHAR(20),
    payment_deadline_type VARCHAR(20) DEFAULT 'eom',
    payment_deadline_days INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS markups (
    id SERIAL PRIMARY KEY,
    markup_group VARCHAR(20) NOT NULL,
    excursion_markup_unit VARCHAR(10) NOT NULL CHECK (excursion_markup_unit IN ('flat rate', '%')),
    excursion_markup DECIMAL(10, 2) NOT NULL,
    tour_markup_unit VARCHAR(10) NOT NULL CHECK (tour_markup_unit IN ('flat rate', '%')),
    tour_markup DECIMAL(10, 2) NOT NULL,
    transfer_markup_unit VARCHAR(10) NOT NULL CHECK (transfer_markup_unit IN ('flat rate', '%')),
    transfer_markup DECIMAL(10, 2) NOT NULL,
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    CONSTRAINT unique_markup_group UNIQUE (markup_group)
);

CREATE TABLE IF NOT EXISTS hotel_markup_percentages (
    id SERIAL PRIMARY KEY,
    markup_id INTEGER REFERENCES markups(id) ON DELETE CASCADE,
    price_from DECIMAL(10, 2) NOT NULL,
    price_to DECIMAL(10, 2) NOT NULL,
    markup_percentage DECIMAL(5, 2) NOT NULL,
    UNIQUE (markup_id, price_from, price_to)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('agent', 'admin', 'user')),
    password VARCHAR(100) NOT NULL,
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    email VARCHAR(100),
    telephone VARCHAR(20),
    location VARCHAR(255),
    offers_transfers BOOLEAN DEFAULT FALSE,
    offers_excursions BOOLEAN DEFAULT FALSE,
    offers_tours BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    number_of_adults INTEGER NOT NULL,
    number_of_kids INTEGER NOT NULL,
    booking_reference VARCHAR(100),
    file_reference VARCHAR(100),
    remarks TEXT,
    total_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    final_amount DECIMAL(10, 2),
    approved BOOLEAN DEFAULT FALSE,
    declined BOOLEAN DEFAULT FALSE,
    is_booking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    transfer_type VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Thailand',
    description TEXT,
    departure VARCHAR(100) NOT NULL,
    arrival VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transfer_pricing (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER REFERENCES transfers(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pax INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    CONSTRAINT unique_transfer_pricing UNIQUE (transfer_id, start_date, end_date, pax, price, cost)
);

-- Create the hotel_trip_items table
CREATE TABLE IF NOT EXISTS hotel_trip_items (
    id SERIAL PRIMARY KEY,
    trip_item_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    promotions INTEGER REFERENCES hotel_promotions(id) ON DELETE CASCADE,
    from_date TIMESTAMP NOT NULL,
    to_date TIMESTAMP NOT NULL,
    city VARCHAR(100) NOT NULL,
    tour_package VARCHAR(255),
    hotel_name VARCHAR(255) NOT NULL,
    nights INTEGER NOT NULL,
    single_price DECIMAL(10, 2),
    double_price DECIMAL(10, 2),
    extra_bed_price DECIMAL(10, 2),
    room_type VARCHAR(100),
    abf_price DECIMAL(10, 2),
    lunch_price DECIMAL(10, 2),
    dinner_price DECIMAL(10, 2),
    rsvn_in TIMESTAMP,
    rsvn_out TIMESTAMP,
    payment_date TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    declined BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfer Trip Table
CREATE TABLE IF NOT EXISTS transfer_trip_items (
    id SERIAL PRIMARY KEY,
    trip_item_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    transfer_id INTEGER REFERENCES transfers(id) ON DELETE CASCADE,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    from_date TIMESTAMP NOT NULL,
    to_date TIMESTAMP NOT NULL,
    flight_number VARCHAR(50),
    ToT VARCHAR(10) NOT NULL CHECK (ToT IN ('SIC', 'PVT')),
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    guide_name VARCHAR(255),
    guide_contact VARCHAR(20),
    approved BOOLEAN DEFAULT FALSE,
    declined BOOLEAN DEFAULT FALSE,
    price DECIMAL(10, 2),
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS excursions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Thailand',
    code VARCHAR(50),
    is_sic_excursion BOOLEAN DEFAULT FALSE,
    description TEXT,
    sic_price_adult DECIMAL(10, 2),
    sic_price_child DECIMAL(10, 2),
    walkin_price DECIMAL(10, 2),
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS excursion_pricing (
    id SERIAL PRIMARY KEY,
    excursion_id INTEGER REFERENCES excursions(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pax INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    supplement_pvt INTEGER,
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    CONSTRAINT unique_excursion_pricing UNIQUE (excursion_id, start_date, end_date, pax, price, cost)
);

-- Excursion Trip Table
CREATE TABLE IF NOT EXISTS excursion_trip_items (
    id SERIAL PRIMARY KEY,
    trip_item_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    excursion_id INTEGER REFERENCES excursions(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    city VARCHAR(100),
    toe VARCHAR(50) NOT NULL CHECK (toe IN ('SIC', 'PVT')),
    from_date TIMESTAMP NOT NULL,
    to_date TIMESTAMP NOT NULL,
    hotel VARCHAR(100),
    guide_name VARCHAR(100),
    guide_contact VARCHAR(20),
    price DECIMAL(10, 2),
    approved BOOLEAN DEFAULT FALSE,
    declined BOOLEAN DEFAULT FALSE,
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tours (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Thailand',
    code VARCHAR(50),
    category VARCHAR(20) NOT NULL CHECK (category IN ('Standard', 'Superior', 'Deluxe')),
    description TEXT,
    duration INTEGER NOT NULL,  -- duration in days
    route TEXT,
    departures VARCHAR(10) NOT NULL CHECK (departures IN ('PVT', 'SIC')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tour_pricing (
    id SERIAL PRIMARY KEY,
    tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    single_room_price DECIMAL(10, 2),
    double_room_price DECIMAL(10, 2),
    triple_room_price DECIMAL(10, 2),
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT
);

-- Tour Trip Table
CREATE TABLE IF NOT EXISTS tour_trip_items (
    id SERIAL PRIMARY KEY,
    trip_item_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    tot VARCHAR(10) NOT NULL CHECK (tot IN ('SIC', 'PVT')),
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    number_of_adults INTEGER NOT NULL,
    number_of_kids INTEGER,
    from_date TIMESTAMP NOT NULL,
    to_date TIMESTAMP NOT NULL,
    flight_in TIMESTAMP,
    flight_number VARCHAR(50),
    flight_out TIMESTAMP,
    guide_name VARCHAR(100),
    guide_contact VARCHAR(20),
    payment_car VARCHAR(50),
    payment_service VARCHAR(50),
    approved BOOLEAN DEFAULT FALSE,
    declined BOOLEAN DEFAULT FALSE,
    price DECIMAL(10, 2),
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flight Trip Table
CREATE TABLE IF NOT EXISTS flight_trip_items (
    id SERIAL PRIMARY KEY,
    trip_item_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    from_date TIMESTAMP NOT NULL,
    to_date TIMESTAMP NOT NULL,
    flight_number VARCHAR(50),
    in_or_out VARCHAR(10),
    route VARCHAR(100),
    issued_by VARCHAR(100),
    approved BOOLEAN DEFAULT FALSE,
    declined BOOLEAN DEFAULT FALSE,
    price DECIMAL(10, 2),
    currency_id INTEGER REFERENCES currencies(id) ON DELETE RESTRICT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS others (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    chargetype VARCHAR(50) NOT NULL CHECK (chargetype IN ('per unit', 'per pax')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS other_trip_items (
    id SERIAL PRIMARY KEY,
    trip_item_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    other_id INTEGER REFERENCES others(id) ON DELETE CASCADE,
    from_date TIMESTAMP NOT NULL,
    to_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    trip_id INT UNIQUE NOT NULL,
    total_cost NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    time VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    cost NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,
    price NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stop_sales (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id INTEGER NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    stopped BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (hotel_id, room_type_id, start_date, end_date)
);

INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Bangkok', 'THB', 'Thai Baht'), ('Phuket', 'THB', 'Thai Baht'), ('Chiang Mai', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Koh Tao', 'THB', 'Thai Baht'), ('Krabi', 'THB', 'Thai Baht'), ('Koh Kood', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Koh Samui', 'THB', 'Thai Baht'), ('Ayutthaya', 'THB', 'Thai Baht'), ('Pattaya', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Koh Phangan', 'THB', 'Thai Baht'), ('Kanchanaburi', 'THB', 'Thai Baht'), ('Chiang Saen', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Hua Hin', 'THB', 'Thai Baht'), ('Koh Samed', 'THB', 'Thai Baht'), ('Koh Chang', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Amphawa', 'THB', 'Thai Baht'), ('Phi Phi Island', 'THB', 'Thai Baht'), ('Koh Yao Noi', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Koh Lipe', 'THB', 'Thai Baht'), ('Rayong', 'THB', 'Thai Baht'), ('Khao Lak', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Koh Lanta', 'THB', 'Thai Baht'), ('Chiang Rai', 'THB', 'Thai Baht'), ('Pai', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Ubon Ratchathani', 'THB', 'Thai Baht'), ('Surin', 'THB', 'Thai Baht'), ('Koh Kradan', 'THB', 'Thai Baht');
INSERT INTO currencies (city, currency_code, currency_name) VALUES ('Khao Yai', 'THB', 'Thai Baht'), ('Mae Hong Son', 'THB', 'Thai Baht');

INSERT INTO agents (name, markup_group, address, email, telephone, fax)
VALUES ('Vera Thailandia Online', '', 'Life condo Sathorn soi 10', 'beppe@verathailandia.com', '026353551', '026353550');

INSERT INTO markups (markup_group, excursion_markup_unit, excursion_markup, tour_markup_unit, tour_markup, transfer_markup_unit, transfer_markup, currency_id)
VALUES
    ('Web', '%', 25, '%', 25, '%', 25, 4),
    ('TO Silver', 'flat rate', 200, 'flat rate', 1500, 'flat rate', 200, 4),
    ('TO Gold', 'flat rate', 300, 'flat rate', 2000, 'flat rate', 300, 4),
    ('TO Bronze', 'flat rate', 100, 'flat rate', 1000, 'flat rate', 100, 4),
    ('Local Agent', '%', 10, '%', 10, '%', 10, 4),
    ('Travel Agent', '%', 15, '%', 15, '%', 15, 4)
ON CONFLICT (markup_group) DO NOTHING;
