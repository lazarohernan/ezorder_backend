-- Opciones/sabores por categoría de menú (heredadas por todos los ítems de la categoría).
-- Ejecutar en Supabase (SQL editor o CLI). No elimina la columna legacy menu.opciones.

ALTER TABLE public.menu_categorias
  ADD COLUMN IF NOT EXISTS opciones jsonb DEFAULT NULL;

COMMENT ON COLUMN public.menu_categorias.opciones IS
  'Grupos de opciones/sabores (JSON: [{nombre, requerido, valores[]}]) para ítems de la categoría';

-- Rellena categorías vacías usando el último menú con opciones de esa categoría (migración desde menu.opciones).
UPDATE public.menu_categorias mc
SET opciones = sub.opciones
FROM (
  SELECT DISTINCT ON (m.categoria_id)
    m.categoria_id,
    m.opciones
  FROM public.menu m
  WHERE m.categoria_id IS NOT NULL
    AND m.opciones IS NOT NULL
    AND jsonb_typeof(m.opciones) = 'array'
    AND jsonb_array_length(m.opciones) > 0
  ORDER BY m.categoria_id, m.created_at DESC NULLS LAST
) sub
WHERE mc.id = sub.categoria_id
  AND (
    mc.opciones IS NULL
    OR jsonb_typeof(mc.opciones) <> 'array'
    OR jsonb_array_length(mc.opciones) = 0
  );
