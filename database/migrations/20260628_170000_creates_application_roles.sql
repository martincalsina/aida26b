-- agregamos users con patente
ALTER TABLE auth.users
ADD COLUMN transport_license VARCHAR(8)
REFERENCES transports(license_plate);


-- lo de RLS

-- lo habilitamos
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- admin tiene todo
CREATE POLICY orders_admin_all
ON orders
FOR ALL
USING (
    current_setting('app.role', true) = 'admin'
);

-- CLIENTE

-- sólo ve sus pedidos
CREATE POLICY orders_client_select
ON orders
FOR SELECT
USING (
    current_setting('app.role', true) = 'client'
    AND
    cuit_client = current_setting('app.client_cuit', true)
);

-- sólo crea pedidos para sí
CREATE POLICY orders_client_insert
ON orders
FOR INSERT
WITH CHECK (
    current_setting('app.role', true) = 'client'
    AND
    cuit_client = current_setting('app.client_cuit', true)
);

-- TRANSPORTE

-- choferes sólo ven sus pedidos

CREATE POLICY orders_driver_select
ON orders
FOR SELECT
USING (
    current_setting('app.role', true) = 'driver'
    AND
    plate_transport = current_setting('app.transport_license', true)
);

-- sólo updatean sus pedidos
CREATE POLICY orders_driver_update
ON orders
FOR UPDATE
USING (
    current_setting('app.role', true) = 'driver'
    AND
    plate_transport = current_setting('app.transport_license', true)
);
