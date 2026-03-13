import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase/supabase';

/**
 * Extrae el número correlativo de un string de rango autorizado.
 * Ej: "000-001-01-00000251" -> 251
 */
const extraerNumeroDeRango = (rango: string): number => {
  const partes = rango.split('-');
  const ultimaParte = partes[partes.length - 1];
  return parseInt(ultimaParte, 10);
};

/**
 * Construye el número de factura completo dado un prefijo y un número correlativo.
 * Ej: prefijo "000-001-01", numero 195 -> "000-001-01-00000195"
 */
const construirNumeroFactura = (rangoInicial: string, numero: number): string => {
  const partes = rangoInicial.split('-');
  const prefijo = partes.slice(0, 3).join('-');
  const padded = numero.toString().padStart(8, '0');
  return `${prefijo}-${padded}`;
};

export const facturacionController = {
  // ==================== DATOS FISCALES ====================

  // Obtener datos fiscales activos de un restaurante
  async getDatosFiscales(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const client = supabaseAdmin || supabase;

      const { data, error } = await client
        .from('datos_fiscales')
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .eq('activo', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(400).json({ error: error.message });
      }

      res.json({ data: data || null });
    } catch (error) {
      console.error('Error getting datos fiscales:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Crear datos fiscales
  async createDatosFiscales(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const {
        restaurante_id,
        nombre_negocio,
        rtn_negocio,
        direccion_negocio,
        correo_negocio,
        telefono_negocio,
        codigo_cai,
        rango_autorizado_inicial,
        rango_autorizado_final,
        fecha_limite_emision
      } = req.body;

      if (!restaurante_id || !nombre_negocio || !rtn_negocio || !codigo_cai ||
          !rango_autorizado_inicial || !rango_autorizado_final || !fecha_limite_emision) {
        return res.status(400).json({
          error: 'Faltan campos obligatorios: restaurante_id, nombre_negocio, rtn_negocio, codigo_cai, rango_autorizado_inicial, rango_autorizado_final, fecha_limite_emision'
        });
      }

      const client = supabaseAdmin || supabase;

      // Verificar permisos según rol
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol !== 1 && id_rol !== 2) {
        if (req.user_info.restaurante_id !== restaurante_id) {
          return res.status(403).json({
            error: 'No tienes acceso a este restaurante'
          });
        }
      }

      // Desactivar datos fiscales anteriores del mismo restaurante
      await client
        .from('datos_fiscales')
        .update({ activo: false })
        .eq('restaurante_id', restaurante_id)
        .eq('activo', true);

      // Calcular numero_actual basado en rango inicial
      const numeroInicial = extraerNumeroDeRango(rango_autorizado_inicial);

      const { data, error } = await client
        .from('datos_fiscales')
        .insert({
          restaurante_id,
          nombre_negocio,
          rtn_negocio,
          direccion_negocio: direccion_negocio || null,
          correo_negocio: correo_negocio || null,
          telefono_negocio: telefono_negocio || null,
          codigo_cai,
          rango_autorizado_inicial,
          rango_autorizado_final,
          fecha_limite_emision,
          numero_actual: numeroInicial - 1,
          activo: true
        })
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(201).json({ data });
    } catch (error) {
      console.error('Error creating datos fiscales:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Actualizar datos fiscales
  async updateDatosFiscales(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const { id } = req.params;
      const {
        nombre_negocio,
        rtn_negocio,
        direccion_negocio,
        correo_negocio,
        telefono_negocio,
        codigo_cai,
        rango_autorizado_inicial,
        rango_autorizado_final,
        fecha_limite_emision
      } = req.body;

      const client = supabaseAdmin || supabase;

      // Verificar que existe
      const { data: existing, error: findError } = await client
        .from('datos_fiscales')
        .select('id, restaurante_id')
        .eq('id', id)
        .single();

      if (findError || !existing) {
        return res.status(404).json({ error: 'Datos fiscales no encontrados' });
      }

      // Verificar permisos
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol !== 1 && id_rol !== 2) {
        if (req.user_info.restaurante_id !== existing.restaurante_id) {
          return res.status(403).json({
            error: 'No tienes acceso a estos datos fiscales'
          });
        }
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (nombre_negocio !== undefined) updateData.nombre_negocio = nombre_negocio;
      if (rtn_negocio !== undefined) updateData.rtn_negocio = rtn_negocio;
      if (direccion_negocio !== undefined) updateData.direccion_negocio = direccion_negocio;
      if (correo_negocio !== undefined) updateData.correo_negocio = correo_negocio;
      if (telefono_negocio !== undefined) updateData.telefono_negocio = telefono_negocio;
      if (codigo_cai !== undefined) updateData.codigo_cai = codigo_cai;
      if (rango_autorizado_inicial !== undefined) updateData.rango_autorizado_inicial = rango_autorizado_inicial;
      if (rango_autorizado_final !== undefined) updateData.rango_autorizado_final = rango_autorizado_final;
      if (fecha_limite_emision !== undefined) updateData.fecha_limite_emision = fecha_limite_emision;

      const { data, error } = await client
        .from('datos_fiscales')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ data });
    } catch (error) {
      console.error('Error updating datos fiscales:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // ==================== FACTURAS ====================

  // Obtener facturas de un restaurante (con paginación y filtros)
  async getFacturas(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const { page = 1, limit = 20, fecha_inicio, fecha_fin, estado } = req.query;

      const client = supabaseAdmin || supabase;
      let query = client
        .from('facturas')
        .select('*, pedidos(id, numero_ticket, tipo_pedido, estado_pedido, created_at)')
        .eq('restaurante_id', restaurante_id)
        .order('fecha_factura', { ascending: false });

      if (fecha_inicio) {
        query = query.gte('fecha_factura', fecha_inicio);
      }
      if (fecha_fin) {
        // Agregar un día para incluir todo el día final
        const fechaFinDate = new Date(fecha_fin as string);
        fechaFinDate.setDate(fechaFinDate.getDate() + 1);
        query = query.lt('fecha_factura', fechaFinDate.toISOString());
      }
      if (estado) {
        query = query.eq('estado', estado);
      }

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error } = await query.range(from, to);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Conteo total
      let countQuery = client
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .eq('restaurante_id', restaurante_id);

      if (fecha_inicio) {
        countQuery = countQuery.gte('fecha_factura', fecha_inicio);
      }
      if (fecha_fin) {
        const fechaFinDate = new Date(fecha_fin as string);
        fechaFinDate.setDate(fechaFinDate.getDate() + 1);
        countQuery = countQuery.lt('fecha_factura', fechaFinDate.toISOString());
      }
      if (estado) {
        countQuery = countQuery.eq('estado', estado);
      }

      const { count } = await countQuery;

      res.json({
        data: data || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting facturas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener facturas del día
  async getFacturasHoy(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const client = supabaseAdmin || supabase;

      // Inicio del día actual (UTC-6 Honduras)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      const { data, error } = await client
        .from('facturas')
        .select('*, pedidos(id, numero_ticket, tipo_pedido, estado_pedido, created_at)')
        .eq('restaurante_id', restaurante_id)
        .gte('fecha_factura', hoy.toISOString())
        .lt('fecha_factura', manana.toISOString())
        .order('fecha_factura', { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ data: data || [] });
    } catch (error) {
      console.error('Error getting facturas de hoy:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener detalle de una factura
  async getFacturaDetalle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const client = supabaseAdmin || supabase;

      const { data, error } = await client
        .from('facturas')
        .select(`
          *,
          datos_fiscales(*),
          pedidos(id, numero_ticket, tipo_pedido, estado_pedido, created_at)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ data });
    } catch (error) {
      console.error('Error getting factura detalle:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Resumen de facturas del día
  async getResumenDia(req: Request, res: Response) {
    try {
      const { restaurante_id } = req.params;
      const client = supabaseAdmin || supabase;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      const { data, error } = await client
        .from('facturas')
        .select('total, isv, estado')
        .eq('restaurante_id', restaurante_id)
        .gte('fecha_factura', hoy.toISOString())
        .lt('fecha_factura', manana.toISOString());

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const facturas = data || [];
      const emitidas = facturas.filter(f => f.estado === 'emitida');

      res.json({
        data: {
          total_facturado: emitidas.reduce((sum, f) => sum + Number(f.total), 0),
          total_isv: emitidas.reduce((sum, f) => sum + Number(f.isv), 0),
          cantidad_facturas: emitidas.length,
          cantidad_anuladas: facturas.filter(f => f.estado === 'anulada').length
        }
      });
    } catch (error) {
      console.error('Error getting resumen del día:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Anular una factura
  async anularFactura(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const { id } = req.params;
      const client = supabaseAdmin || supabase;

      const { data: facturaExistente, error: findError } = await client
        .from('facturas')
        .select('id, restaurante_id, estado')
        .eq('id', id)
        .single();

      if (findError || !facturaExistente) {
        return res.status(404).json({ error: 'Factura no encontrada' });
      }

      if (facturaExistente.estado === 'anulada') {
        return res.status(400).json({ error: 'La factura ya está anulada' });
      }

      // Verificar permisos
      const id_rol = req.user_info?.rol_id ?? 3;
      if (id_rol !== 1 && id_rol !== 2) {
        if (req.user_info.restaurante_id !== facturaExistente.restaurante_id) {
          return res.status(403).json({
            error: 'No tienes acceso a esta factura'
          });
        }
      }

      const { data, error } = await client
        .from('facturas')
        .update({ estado: 'anulada' })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ data });
    } catch (error) {
      console.error('Error anulando factura:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Generar factura desde un pedido
  async generarFactura(req: Request, res: Response) {
    try {
      if (!req.user_info) {
        return res.status(403).json({
          error: 'No se encontró información del usuario autenticado'
        });
      }

      const {
        pedido_id,
        restaurante_id,
        nombre_cliente,
        rtn_cliente,
        metodo_pago_id
      } = req.body;

      if (!pedido_id || !restaurante_id) {
        return res.status(400).json({
          error: 'Faltan campos obligatorios: pedido_id, restaurante_id'
        });
      }

      const client = supabaseAdmin || supabase;

      // 0. Verificar si ya existe una factura para este pedido
      const { data: facturaExistente } = await client
        .from('facturas')
        .select('*, datos_fiscales:datos_fiscales_id(*)')
        .eq('pedido_id', pedido_id)
        .eq('estado', 'emitida')
        .maybeSingle();

      if (facturaExistente) {
        const { datos_fiscales: df, ...facturaSinDf } = facturaExistente;
        return res.status(200).json({
          data: {
            factura: facturaSinDf,
            datos_fiscales: df
          }
        });
      }

      // 1. Obtener datos fiscales activos
      const { data: datosFiscales, error: dfError } = await client
        .from('datos_fiscales')
        .select('*')
        .eq('restaurante_id', restaurante_id)
        .eq('activo', true)
        .single();

      if (dfError || !datosFiscales) {
        return res.status(400).json({
          error: 'No se encontraron datos fiscales activos para este restaurante. Configure los datos de facturación primero.'
        });
      }

      // 2. Validar fecha límite de emisión
      const fechaLimite = new Date(datosFiscales.fecha_limite_emision);
      if (new Date() > fechaLimite) {
        return res.status(400).json({
          error: 'La fecha límite de emisión ha expirado. Actualice los datos fiscales con un nuevo CAI.'
        });
      }

      // 3. Validar rango disponible
      const rangoFinal = extraerNumeroDeRango(datosFiscales.rango_autorizado_final);
      const siguienteNumero = datosFiscales.numero_actual + 1;

      if (siguienteNumero > rangoFinal) {
        return res.status(400).json({
          error: 'Se ha agotado el rango autorizado de facturación. Solicite un nuevo rango.'
        });
      }

      // 4. Obtener datos del pedido
      const { data: pedido, error: pedidoError } = await client
        .from('pedidos')
        .select('*')
        .eq('id', pedido_id)
        .single();

      if (pedidoError || !pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      // 5. Construir número de factura
      const numeroFactura = construirNumeroFactura(
        datosFiscales.rango_autorizado_inicial,
        siguienteNumero
      );

      // 6. Incrementar numero_actual atómicamente
      const { error: updateError } = await client
        .from('datos_fiscales')
        .update({ numero_actual: siguienteNumero })
        .eq('id', datosFiscales.id)
        .eq('numero_actual', datosFiscales.numero_actual); // Optimistic locking

      if (updateError) {
        return res.status(500).json({
          error: 'Error al actualizar el correlativo. Intente de nuevo.'
        });
      }

      // 7. Crear la factura
      const { data: factura, error: facturaError } = await client
        .from('facturas')
        .insert({
          restaurante_id,
          pedido_id,
          datos_fiscales_id: datosFiscales.id,
          usuario_id: req.user_info.id || null,
          numero_factura: numeroFactura,
          nombre_cliente: nombre_cliente || 'Consumidor final',
          rtn_cliente: rtn_cliente || null,
          subtotal: pedido.subtotal,
          descuento: pedido.descuento,
          importe_exento: pedido.importe_exento || 0,
          importe_exonerado: pedido.importe_exonerado || 0,
          importe_gravado: pedido.importe_gravado || 0,
          isv: pedido.impuesto,
          total: pedido.total,
          metodo_pago_id: metodo_pago_id || pedido.metodo_pago_id
        })
        .select('*')
        .single();

      if (facturaError) {
        return res.status(400).json({ error: facturaError.message });
      }

      // Devolver factura + datos fiscales para generar PDF
      res.status(201).json({
        data: {
          factura,
          datos_fiscales: datosFiscales
        }
      });
    } catch (error) {
      console.error('Error generando factura:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};
