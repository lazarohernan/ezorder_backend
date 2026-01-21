-- Crear tabla de descuentos
CREATE TABLE IF NOT EXISTS descuentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  porcentaje DECIMAL(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por estado activo
CREATE INDEX IF NOT EXISTS idx_descuentos_activo ON descuentos(activo);

-- Crear índice para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_descuentos_created_at ON descuentos(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE descuentos ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT a usuarios autenticados
CREATE POLICY "Permitir SELECT a usuarios autenticados" ON descuentos
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para permitir INSERT a usuarios autenticados
CREATE POLICY "Permitir INSERT a usuarios autenticados" ON descuentos
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir UPDATE a usuarios autenticados
CREATE POLICY "Permitir UPDATE a usuarios autenticados" ON descuentos
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir DELETE a usuarios autenticados
CREATE POLICY "Permitir DELETE a usuarios autenticados" ON descuentos
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_descuentos_updated_at
  BEFORE UPDATE ON descuentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunos descuentos de ejemplo (opcional)
INSERT INTO descuentos (nombre, porcentaje, activo) VALUES
  ('Tercera Edad', 30, true),
  ('Estudiante', 15, true),
  ('Empleado', 20, true)
ON CONFLICT DO NOTHING;
