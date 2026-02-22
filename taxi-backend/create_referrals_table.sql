-- Tabla de referidos
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES drivers(id),
    referred_id INTEGER NOT NULL REFERENCES drivers(id),
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, paid
    referrer_bonus DECIMAL(10,2) DEFAULT 500.00,
    referred_bonus DECIMAL(10,2) DEFAULT 200.00,
    referrer_paid BOOLEAN DEFAULT FALSE,
    referred_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(referred_id)
);

-- Agregar columna de código de referido a drivers si no existe
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES drivers(id);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_drivers_referral_code ON drivers(referral_code);