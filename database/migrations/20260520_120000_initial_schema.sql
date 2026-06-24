CREATE TABLE warehouses (
    address         VARCHAR(100) PRIMARY KEY,
    longitude       INTEGER NOT NULL,
    latitude        INTEGER NOT NULL,
    name       VARCHAR(100) NOT NULL
);

CREATE TABLE transports (
    license_plate           VARCHAR(8) PRIMARY KEY,
    warehouse_address       VARCHAR(100) REFERENCES warehouses(ADDRESS) NOT NULL,
    availability            VARCHAR(50)
);

CREATE TABLE stocks (
    cod_stock       VARCHAR(100) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL
);

CREATE TABLE clients (
    cuit            VARCHAR(30) PRIMARY KEY,
    address         VARCHAR(100) NOT NULL,
    longitude       INTEGER NOT NULL,
    latitude        INTEGER NOT NULL,
    name            VARCHAR(100) NOT NULL
);

CREATE TABLE orders (
    uuid            VARCHAR(30) PRIMARY KEY,
    order_date      DATE NOT NULL,
    cuit_client     VARCHAR(30) REFERENCES clients(cuit) NOT NULL,
    plate_transport VARCHAR(8) REFERENCES transports(license_plate) NOT NULL,
    status          VARCHAR(50)
);

CREATE TABLE items (
    cod_item                VARCHAR(30) PRIMARY KEY,
    cod_stock               VARCHAR(100) REFERENCES stocks(cod_stock) NOT NULL,
    warehouse_address       VARCHAR(100) REFERENCES warehouses(address) NOT NULL,
    order_uuid              VARCHAR(30) REFERENCES orders(uuid)
);
