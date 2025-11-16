-- ==========================================
-- SMART PASSES PLATFORM - DATABASE SCHEMA
-- Cloudflare D1 (SQLite)
-- ==========================================

-- Tabla de Administradores
CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin por defecto: admin / admin123
-- Password hasheado con SHA-256
INSERT INTO admin (username, password) VALUES
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

-- ==========================================
-- Tabla de Clientes
-- ==========================================
CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre_negocio TEXT NOT NULL,
    email TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    activo INTEGER DEFAULT 1,
    fecha_creacion INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Tabla de Clases (Google Wallet)
-- ==========================================
CREATE TABLE IF NOT EXISTS clases (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL,
    tipo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    config TEXT NOT NULL,
    creada_en INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- ==========================================
-- Tabla de Pases Creados
-- ==========================================
CREATE TABLE IF NOT EXISTS pases (
    id TEXT PRIMARY KEY,
    objeto_id TEXT UNIQUE NOT NULL,
    class_id TEXT NOT NULL,
    cliente_id TEXT NOT NULL,
    tipo TEXT NOT NULL,
    datos TEXT NOT NULL,
    estado TEXT DEFAULT 'ACTIVE',
    creado_en INTEGER NOT NULL,
    actualizado_en INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES clases(id) ON DELETE CASCADE
);

-- ==========================================
-- Tabla de Eventos (Webhooks)
-- ==========================================
CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    objeto_id TEXT,
    class_id TEXT,
    datos TEXT,
    timestamp INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Índices para Performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_clientes_api_key ON clientes(api_key);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_clases_cliente ON clases(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pases_cliente ON pases(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pases_objeto ON pases(objeto_id);
CREATE INDEX IF NOT EXISTS idx_pases_estado ON pases(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON eventos(timestamp);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
