-- Migración: Agregar soporte para cierre de caja manual
-- Fecha: 2026-02-04
-- Descripción: Agrega campos para permitir que ciertos roles ingresen datos manualmente
--              al cerrar caja y el sistema compare con los datos calculados automáticamente

-- ============================================================================
-- PARTE 1: Agregar campo a roles_personalizados
-- ============================================================================

-- Agregar campo para indicar si el rol requiere cierre manual
ALTER TABLE roles_personalizados 
ADD COLUMN IF NOT EXISTS requiere_cierre_manual BOOLEAN DEFAULT false;

COMMENT ON COLUMN roles_personalizados.requiere_cierre_manual IS 
'Indica si el rol debe ingresar datos manualmente al cerrar caja. Si es true, el usuario verá un formulario para ingresar efectivo, ventas POS, transferencias y gastos. El sistema comparará estos datos con los calculados automáticamente.';

-- Marcar roles tipo "Cajero" como requiere cierre manual
UPDATE roles_personalizados 
SET requiere_cierre_manual = true 
WHERE nombre ILIKE '%cajero%' AND activo = true;

-- ============================================================================
-- PARTE 2: Agregar campos a tabla cajas para almacenar datos manuales
-- ============================================================================

-- Datos declarados manualmente por el usuario al cerrar caja
ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS efectivo_declarado DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS ventas_pos_declaradas DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS ventas_transferencia_declaradas DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS gastos_declarados DECIMAL(10,2);

-- Datos calculados automáticamente por el sistema
ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS efectivo_sistema DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS ventas_pos_sistema DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS ventas_transferencia_sistema DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS gastos_sistema DECIMAL(10,2);

-- Diferencias entre datos declarados y calculados
ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS diferencia_efectivo DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS diferencia_pos DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS diferencia_transferencia DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS diferencia_gastos DECIMAL(10,2);

ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS diferencia_total DECIMAL(10,2);

-- Estado del cuadre de caja
ALTER TABLE cajas 
ADD COLUMN IF NOT EXISTS estado_cuadre VARCHAR(20);

-- Agregar constraint para estado_cuadre
ALTER TABLE cajas 
ADD CONSTRAINT check_estado_cuadre 
CHECK (estado_cuadre IS NULL OR estado_cuadre IN ('cuadrada', 'descuadrada'));

-- Agregar comentarios para documentación
COMMENT ON COLUMN cajas.efectivo_declarado IS 'Monto de efectivo declarado manualmente por el usuario al cerrar caja';
COMMENT ON COLUMN cajas.ventas_pos_declaradas IS 'Monto de ventas con POS/tarjeta declarado manualmente por el usuario';
COMMENT ON COLUMN cajas.ventas_transferencia_declaradas IS 'Monto de ventas por transferencia declarado manualmente por el usuario';
COMMENT ON COLUMN cajas.gastos_declarados IS 'Monto de gastos declarado manualmente por el usuario';

COMMENT ON COLUMN cajas.efectivo_sistema IS 'Monto de efectivo calculado automáticamente por el sistema (pedidos con método efectivo)';
COMMENT ON COLUMN cajas.ventas_pos_sistema IS 'Monto de ventas con POS calculado automáticamente por el sistema';
COMMENT ON COLUMN cajas.ventas_transferencia_sistema IS 'Monto de ventas por transferencia calculado automáticamente por el sistema';
COMMENT ON COLUMN cajas.gastos_sistema IS 'Monto de gastos calculado automáticamente por el sistema';

COMMENT ON COLUMN cajas.diferencia_efectivo IS 'Diferencia entre efectivo declarado y calculado (declarado - sistema)';
COMMENT ON COLUMN cajas.diferencia_pos IS 'Diferencia entre ventas POS declaradas y calculadas';
COMMENT ON COLUMN cajas.diferencia_transferencia IS 'Diferencia entre ventas por transferencia declaradas y calculadas';
COMMENT ON COLUMN cajas.diferencia_gastos IS 'Diferencia entre gastos declarados y calculados';
COMMENT ON COLUMN cajas.diferencia_total IS 'Diferencia total del cierre de caja (suma de todas las diferencias)';

COMMENT ON COLUMN cajas.estado_cuadre IS 'Estado del cuadre de caja: "cuadrada" si la diferencia es menor a 0.01, "descuadrada" si hay diferencias significativas';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que los campos se agregaron correctamente
DO $$
BEGIN
    -- Verificar roles_personalizados
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles_personalizados' 
        AND column_name = 'requiere_cierre_manual'
    ) THEN
        RAISE NOTICE '✓ Campo requiere_cierre_manual agregado a roles_personalizados';
    ELSE
        RAISE EXCEPTION '✗ Error: Campo requiere_cierre_manual NO se agregó a roles_personalizados';
    END IF;

    -- Verificar cajas
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cajas' 
        AND column_name = 'efectivo_declarado'
    ) THEN
        RAISE NOTICE '✓ Campos de cierre manual agregados a tabla cajas';
    ELSE
        RAISE EXCEPTION '✗ Error: Campos de cierre manual NO se agregaron a tabla cajas';
    END IF;

    -- Mostrar roles marcados con requiere_cierre_manual
    RAISE NOTICE '--- Roles con cierre manual habilitado ---';
    FOR rec IN 
        SELECT nombre FROM roles_personalizados 
        WHERE requiere_cierre_manual = true
    LOOP
        RAISE NOTICE '  - %', rec.nombre;
    END LOOP;

    RAISE NOTICE '✓ Migración completada exitosamente';
END $$;
