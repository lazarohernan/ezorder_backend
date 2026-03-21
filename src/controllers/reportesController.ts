import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../supabase/supabase";

type TipoReporte =
  | "contable_mensual"
  | "ventas_reporte"
  | "ventas_periodo"
  | "gastos_categoria"
  | "inventario_movimientos"
  | "caja_auditoria"
  | "consolidado_ejecutivo"
  | "rendimiento_cocina";

type PreviewRequestBody = {
  tipo?: TipoReporte;
  fechaInicio?: string;
  fechaFin?: string;
  restauranteId?: string | null;
  consolidado?: boolean;
  formato?: string;
};

const client = supabaseAdmin || supabase;

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : value;
};

const buildDateRange = (fechaInicio: string, fechaFin: string) => ({
  from: `${fechaInicio}T00:00:00.000Z`,
  to: `${fechaFin}T23:59:59.999Z`,
});

const getAccessibleRestaurantIds = async (req: Request): Promise<string[]> => {
  if (!req.user_info) return [];

  const rolId = req.user_info.rol_id ?? 3;
  if (rolId === 1) {
    const { data, error } = await client.from("restaurantes").select("id");
    if (error) throw error;
    return (data || []).map((r: { id: string }) => r.id);
  }

  if (rolId === 2) {
    const { data, error } = await client
      .from("usuarios_restaurantes")
      .select("restaurante_id")
      .eq("usuario_id", req.user_info.id);
    if (error) throw error;
    return (data || []).map((r: { restaurante_id: string }) => r.restaurante_id);
  }

  return req.user_info.restaurante_id ? [req.user_info.restaurante_id] : [];
};

const normalizeScopedRestaurants = (
  accesibles: string[],
  restauranteId?: string | null,
  consolidado?: boolean
) => {
  if (!accesibles.length) return [];
  if (consolidado) {
    return accesibles;
  }
  if (restauranteId && accesibles.includes(restauranteId)) {
    return [restauranteId];
  }
  return [accesibles[0]];
};

const toDateOnly = (value: string | null | undefined) => (value || "").split("T")[0];

const buildVentasPorMetodo = (
  pedidos: Array<{ metodo_pago_id?: number | null; total: number | null }>
) =>
  pedidos.reduce(
    (
      acc: {
        efectivo: number;
        pos: number;
        transferencia: number;
        otros: number;
      },
      p
    ) => {
      const total = Number(p.total || 0);
      if (p.metodo_pago_id === 1) acc.efectivo += total;
      else if (p.metodo_pago_id === 2) acc.pos += total;
      else if (p.metodo_pago_id === 3) acc.transferencia += total;
      else acc.otros += total;
      return acc;
    },
    { efectivo: 0, pos: 0, transferencia: 0, otros: 0 }
  );

const buildVentasPorMetodoDetallado = (
  pedidos: Array<{ metodo_pago_id?: number | null; total: number | null }>
) => {
  const map: Record<string, { metodo: string; pedidos: number; total: number }> = {
    efectivo: { metodo: "Efectivo", pedidos: 0, total: 0 },
    pos: { metodo: "Tarjeta", pedidos: 0, total: 0 },
    transferencia: { metodo: "Transferencia", pedidos: 0, total: 0 },
    otros: { metodo: "Otros", pedidos: 0, total: 0 },
  };
  for (const p of pedidos) {
    const total = Number(p.total || 0);
    if (p.metodo_pago_id === 1) { map.efectivo.pedidos++; map.efectivo.total += total; }
    else if (p.metodo_pago_id === 2) { map.pos.pedidos++; map.pos.total += total; }
    else if (p.metodo_pago_id === 3) { map.transferencia.pedidos++; map.transferencia.total += total; }
    else { map.otros.pedidos++; map.otros.total += total; }
  }
  return Object.values(map).filter((m) => m.pedidos > 0);
};

const buildGastosPorCategoria = (
  gastos: Array<{ categoria?: string | null; monto: number | null }>
) =>
  gastos.reduce(
    (acc: Record<string, number>, g) => {
      const key = (g.categoria || "Sin categoría").trim();
      acc[key] = (acc[key] || 0) + Number(g.monto || 0);
      return acc;
    },
    {}
  );

const buildDailyResumen = (
  pedidos: Array<{
    created_at: string;
    metodo_pago_id?: number | null;
    total: number | null;
  }>,
  gastos: Array<{ fecha_gasto?: string | null; monto: number | null }>
) => {
  const map = new Map<
    string,
    {
      fecha: string;
      pedidos: number;
      ventas: number;
      gastos: number;
      efectivo: number;
      pos: number;
      transferencia: number;
      otros: number;
    }
  >();

  const ensure = (fecha: string) => {
    if (!map.has(fecha)) {
      map.set(fecha, {
        fecha,
        pedidos: 0,
        ventas: 0,
        gastos: 0,
        efectivo: 0,
        pos: 0,
        transferencia: 0,
        otros: 0,
      });
    }
    return map.get(fecha)!;
  };

  for (const p of pedidos) {
    const fecha = toDateOnly(p.created_at);
    const row = ensure(fecha);
    const total = Number(p.total || 0);
    row.pedidos += 1;
    row.ventas += total;
    if (p.metodo_pago_id === 1) row.efectivo += total;
    else if (p.metodo_pago_id === 2) row.pos += total;
    else if (p.metodo_pago_id === 3) row.transferencia += total;
    else row.otros += total;
  }

  for (const g of gastos) {
    const fecha = toDateOnly(g.fecha_gasto || "");
    const row = ensure(fecha);
    row.gastos += Number(g.monto || 0);
  }

  return Array.from(map.values())
    .map((r) => ({ ...r, balance: r.ventas - r.gastos }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
};

export const previewReporte = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      return res.status(403).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    const {
      tipo = "contable_mensual",
      fechaInicio,
      fechaFin,
      restauranteId = null,
      consolidado = false,
    } = req.body as PreviewRequestBody;

    if (
      ![
        "contable_mensual",
        "ventas_reporte",
        "ventas_periodo",
        "gastos_categoria",
        "inventario_movimientos",
        "caja_auditoria",
        "consolidado_ejecutivo",
        "rendimiento_cocina",
      ].includes(tipo)
    ) {
      return res.status(400).json({
        success: false,
        message: "Tipo de reporte no soportado",
      });
    }

    const fechaInicioOk = parseDate(fechaInicio);
    const fechaFinOk = parseDate(fechaFin);

    if (!fechaInicioOk || !fechaFinOk) {
      return res.status(400).json({
        success: false,
        message: "Debes enviar fechaInicio y fechaFin válidas (YYYY-MM-DD)",
      });
    }

    if (fechaInicioOk > fechaFinOk) {
      return res.status(400).json({
        success: false,
        message: "La fecha de inicio no puede ser mayor que la fecha fin",
      });
    }

    const accesibles = await getAccessibleRestaurantIds(req);
    if (!accesibles.length) {
      return res.status(403).json({
        success: false,
        message: "No tienes restaurantes asignados para generar reportes",
      });
    }

    const restaurantesScope = normalizeScopedRestaurants(accesibles, restauranteId, consolidado);
    if (!restaurantesScope.length) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso al restaurante seleccionado",
      });
    }

    const { from, to } = buildDateRange(fechaInicioOk, fechaFinOk);

    const { data: pedidosData, error: pedidosError } = await client
      .from("pedidos")
      .select("id, restaurante_id, total, subtotal, impuesto, descuento, metodo_pago_id, created_at, estado_pedido, pagado")
      .in("restaurante_id", restaurantesScope)
      .gte("created_at", from)
      .lte("created_at", to);
    if (pedidosError) throw pedidosError;

    const { data: gastosData, error: gastosError } = await client
      .from("gastos")
      .select("id, restaurante_id, categoria, descripcion, monto, fecha_gasto, tipo_gasto")
      .in("restaurante_id", restaurantesScope)
      .gte("fecha_gasto", fechaInicioOk)
      .lte("fecha_gasto", fechaFinOk);
    if (gastosError) throw gastosError;

    const { data: restaurantesData, error: restaurantesError } = await client
      .from("restaurantes")
      .select("id, nombre_restaurante")
      .in("id", restaurantesScope);
    if (restaurantesError) throw restaurantesError;

    const restaurantesMap = new Map(
      (restaurantesData || []).map((r: { id: string; nombre_restaurante: string }) => [
        r.id,
        r.nombre_restaurante,
      ])
    );

    const pedidosValidos = (pedidosData || []).filter(
      (p: { pagado?: boolean; estado_pedido?: string }) =>
        p.pagado === true || ["en_preparacion", "entregado"].includes(p.estado_pedido || "")
    );

    const ventasTotal = pedidosValidos.reduce(
      (sum: number, p: { total: number | null }) => sum + Number(p.total || 0),
      0
    );
    const gastosTotal = (gastosData || []).reduce(
      (sum: number, g: { monto: number | null }) => sum + Number(g.monto || 0),
      0
    );

    const pedidoIds = pedidosValidos.map((p: { id: string }) => p.id);
    let pedidoItemsData: Array<{
      pedido_id: string;
      nombre_menu: string;
      cantidad: number | null;
      total_item: number | null;
    }> = [];

    if (pedidoIds.length > 0) {
      const { data: itemsData, error: itemsError } = await client
        .from("pedido_items")
        .select("pedido_id, nombre_menu, cantidad, total_item")
        .in("pedido_id", pedidoIds);
      if (itemsError) throw itemsError;
      pedidoItemsData = itemsData || [];
    }

    const pedidoRestaurantMap = new Map(
      pedidosValidos.map((p: { id: string; restaurante_id: string }) => [p.id, p.restaurante_id])
    );

    const topProductos = Object.values(
      pedidoItemsData.reduce(
        (
          acc: Record<
            string,
            { nombre_menu: string; cantidad: number; total_vendido: number }
          >,
          item
        ) => {
          const key = item.nombre_menu || "Sin nombre";
          if (!acc[key]) {
            acc[key] = { nombre_menu: key, cantidad: 0, total_vendido: 0 };
          }
          acc[key].cantidad += Number(item.cantidad || 0);
          acc[key].total_vendido += Number(item.total_item || 0);
          return acc;
        },
        {}
      )
    )
      .sort((a, b) => b.total_vendido - a.total_vendido)
      .slice(0, 25);

    const ventasPorMetodo = buildVentasPorMetodo(
      pedidosValidos as Array<{ metodo_pago_id?: number | null; total: number | null }>
    );
    const gastosPorCategoria = buildGastosPorCategoria(
      (gastosData || []) as Array<{ categoria?: string | null; monto: number | null }>
    );
    const diario = buildDailyResumen(
      pedidosValidos as Array<{
        created_at: string;
        metodo_pago_id?: number | null;
        total: number | null;
      }>,
      (gastosData || []) as Array<{ fecha_gasto?: string | null; monto: number | null }>
    );

    if (tipo === "contable_mensual") {
      // Query adicional: datos de caja por día
      const { data: cajasData, error: cajasError } = await client
        .from("caja")
        .select("id, restaurante_id, fecha_apertura, monto_inicial, total_ingresos, total_retiros, total_egresos, estado")
        .in("restaurante_id", restaurantesScope)
        .gte("fecha_apertura", from)
        .lte("fecha_apertura", to);
      if (cajasError) throw cajasError;

      // Construir mapa diario de caja
      const cajaDiaria: Record<string, { apertura: number; cambio: number; retiros: number; egresos: number }> = {};
      for (const caja of (cajasData || [])) {
        const fecha = toDateOnly(caja.fecha_apertura);
        const existing = cajaDiaria[fecha] || { apertura: 0, cambio: 0, retiros: 0, egresos: 0 };
        existing.apertura += Number(caja.monto_inicial || 0);
        existing.cambio += Number(caja.total_ingresos || 0);
        existing.retiros += Number(caja.total_retiros || 0);
        existing.egresos += Number(caja.total_egresos || 0);
        cajaDiaria[fecha] = existing;
      }

      // Construir desglose de gastos por item (fecha + descripcion + monto)
      const gastosDesglose = (gastosData || []).map((g: any) => ({
        fecha: toDateOnly(g.fecha_gasto || ""),
        descripcion: (g.descripcion || "Sin descripción").trim(),
        categoria: (g.categoria || "Sin categoría").trim(),
        monto: Number(g.monto || 0),
        tipo_gasto: (g.tipo_gasto || "variable") as "variable" | "fijo",
      }));

      return res.status(200).json({
        success: true,
        data: {
          tipo,
          rango: { fechaInicio: fechaInicioOk, fechaFin: fechaFinOk },
          restaurantes: restaurantesScope.map((id) => ({
            id,
            nombre: restaurantesMap.get(id) || "Restaurante",
          })),
          resumen: {
            totalVentas: ventasTotal,
            totalGastos: gastosTotal,
            balance: ventasTotal - gastosTotal,
            totalPedidos: pedidosValidos.length,
          },
          detalle: {
            ventasPorMetodo,
            gastosPorCategoria,
            diario,
            topProductos,
            gastosDesglose,
            cajaDiaria,
          },
        },
      });
    }

    if (tipo === "ventas_periodo") {
      const diaMayorVenta = diario.reduce(
        (max, item) => (item.ventas > max.ventas ? item : max),
        { fecha: "", ventas: 0 }
      );
      const diaMenorVenta = diario.reduce(
        (min, item) => (item.ventas < min.ventas ? item : min),
        diario.length ? { fecha: diario[0].fecha, ventas: diario[0].ventas } : { fecha: "", ventas: 0 }
      );

      return res.status(200).json({
        success: true,
        data: {
          tipo,
          rango: { fechaInicio: fechaInicioOk, fechaFin: fechaFinOk },
          restaurantes: restaurantesScope.map((id) => ({
            id,
            nombre: restaurantesMap.get(id) || "Restaurante",
          })),
          resumen: {
            totalVentas: ventasTotal,
            totalPedidos: pedidosValidos.length,
            ticketPromedio: pedidosValidos.length ? ventasTotal / pedidosValidos.length : 0,
            diaMayorVenta,
            diaMenorVenta,
          },
          detalle: {
            diario,
            ventasPorMetodo,
            topProductos,
          },
        },
      });
    }

    if (tipo === "ventas_reporte") {
      const restaurantesDetalle = restaurantesScope.map((id) => {
        const pedidosRest = pedidosValidos.filter(
          (p: { restaurante_id: string }) => p.restaurante_id === id
        );

        const totalVentasRest = pedidosRest.reduce(
          (sum: number, p: { total: number | null }) => sum + Number(p.total || 0), 0
        );
        const subtotalRest = pedidosRest.reduce(
          (sum: number, p: { subtotal?: number | null }) => sum + Number(p.subtotal || 0), 0
        );
        const impuestoRest = pedidosRest.reduce(
          (sum: number, p: { impuesto?: number | null }) => sum + Number(p.impuesto || 0), 0
        );
        const descuentoRest = pedidosRest.reduce(
          (sum: number, p: { descuento?: number | null }) => sum + Number(p.descuento || 0), 0
        );
        const ticketPromedioRest = pedidosRest.length
          ? totalVentasRest / pedidosRest.length
          : 0;

        const ventasPorMetodoRest = buildVentasPorMetodoDetallado(
          pedidosRest as Array<{ metodo_pago_id?: number | null; total: number | null }>
        );

        const productosRest = Object.values(
          pedidoItemsData.reduce(
            (
              acc: Record<string, { nombre_menu: string; cantidad: number; total_vendido: number }>,
              item
            ) => {
              const restId = pedidoRestaurantMap.get(item.pedido_id);
              if (restId !== id) return acc;
              const key = item.nombre_menu || "Sin nombre";
              if (!acc[key]) acc[key] = { nombre_menu: key, cantidad: 0, total_vendido: 0 };
              acc[key].cantidad += Number(item.cantidad || 0);
              acc[key].total_vendido += Number(item.total_item || 0);
              return acc;
            },
            {}
          )
        ).sort((a, b) => b.total_vendido - a.total_vendido);

        return {
          restaurante_id: id,
          restaurante_nombre: restaurantesMap.get(id) || "Restaurante",
          pedidos: pedidosRest.length,
          totalVentas: totalVentasRest,
          subtotal: subtotalRest,
          impuesto: impuestoRest,
          descuento: descuentoRest,
          ticketPromedio: ticketPromedioRest,
          ventasPorMetodo: ventasPorMetodoRest,
          productos: productosRest,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          tipo,
          rango: { fechaInicio: fechaInicioOk, fechaFin: fechaFinOk },
          restaurantes: restaurantesScope.map((id) => ({
            id,
            nombre: restaurantesMap.get(id) || "Restaurante",
          })),
          resumen: {
            totalVentas: ventasTotal,
            totalPedidos: pedidosValidos.length,
          },
          detalle: {
            restaurantes: restaurantesDetalle,
          },
        },
      });
    }

    if (tipo === "gastos_categoria") {
      const topCategorias = Object.entries(gastosPorCategoria)
        .map(([categoria, monto]) => ({ categoria, monto }))
        .sort((a, b) => b.monto - a.monto);

      return res.status(200).json({
        success: true,
        data: {
          tipo,
          rango: { fechaInicio: fechaInicioOk, fechaFin: fechaFinOk },
          restaurantes: restaurantesScope.map((id) => ({
            id,
            nombre: restaurantesMap.get(id) || "Restaurante",
          })),
          resumen: {
            totalGastos: gastosTotal,
            categorias: topCategorias.length,
            totalVentas: ventasTotal,
            balance: ventasTotal - gastosTotal,
          },
          detalle: {
            gastosPorCategoria,
            topCategorias,
            diario,
          },
        },
      });
    }

    if (tipo === "inventario_movimientos") {
      const { data: inventarioData, error: inventarioError } = await client
        .from("inventario")
        .select("id, nombre, restaurante_id, unidad_medida")
        .in("restaurante_id", restaurantesScope);
      if (inventarioError) throw inventarioError;

      const inventarioIds = (inventarioData || []).map((i: { id: string }) => i.id);
      const inventarioMap = new Map(
        (inventarioData || []).map(
          (i: { id: string; nombre: string; restaurante_id: string; unidad_medida?: string | null }) => [
            i.id,
            {
              nombre: i.nombre,
              restaurante_id: i.restaurante_id,
              unidad_medida: i.unidad_medida || "und",
            },
          ]
        )
      );

      let movimientosData: Array<{
        inventario_id: string;
        tipo_movimiento: "entrada" | "salida" | "ajuste";
        cantidad: number;
        motivo?: string | null;
        referencia?: string | null;
        created_at: string;
      }> = [];

      if (inventarioIds.length) {
        const { data: rows, error: movimientosError } = await client
          .from("movimientos_inventario")
          .select("inventario_id, tipo_movimiento, cantidad, motivo, referencia, created_at")
          .in("inventario_id", inventarioIds)
          .gte("created_at", from)
          .lte("created_at", to)
          .order("created_at", { ascending: false })
          .limit(1000);
        if (movimientosError) throw movimientosError;
        movimientosData = rows || [];
      }

      const resumen = movimientosData.reduce(
        (acc, mov) => {
          acc.totalMovimientos += 1;
          if (mov.tipo_movimiento === "entrada") {
            acc.entradas += 1;
            acc.cantidadEntrada += Number(mov.cantidad || 0);
          } else if (mov.tipo_movimiento === "salida") {
            acc.salidas += 1;
            acc.cantidadSalida += Number(mov.cantidad || 0);
          } else {
            acc.ajustes += 1;
          }
          return acc;
        },
        {
          totalMovimientos: 0,
          entradas: 0,
          salidas: 0,
          ajustes: 0,
          cantidadEntrada: 0,
          cantidadSalida: 0,
        }
      );

      const resumenPorProducto = Object.values(
        movimientosData.reduce(
          (
            acc: Record<
              string,
              {
                inventario_id: string;
                nombre: string;
                unidad: string;
                entradas: number;
                salidas: number;
                ajustes: number;
                neto: number;
              }
            >,
            mov
          ) => {
            const inv = inventarioMap.get(mov.inventario_id);
            if (!inv) return acc;
            if (!acc[mov.inventario_id]) {
              acc[mov.inventario_id] = {
                inventario_id: mov.inventario_id,
                nombre: inv.nombre,
                unidad: inv.unidad_medida,
                entradas: 0,
                salidas: 0,
                ajustes: 0,
                neto: 0,
              };
            }
            const cantidad = Number(mov.cantidad || 0);
            if (mov.tipo_movimiento === "entrada") {
              acc[mov.inventario_id].entradas += cantidad;
              acc[mov.inventario_id].neto += cantidad;
            } else if (mov.tipo_movimiento === "salida") {
              acc[mov.inventario_id].salidas += cantidad;
              acc[mov.inventario_id].neto -= cantidad;
            } else {
              acc[mov.inventario_id].ajustes += cantidad;
            }
            return acc;
          },
          {}
        )
      )
        .sort((a, b) => Math.abs(b.neto) - Math.abs(a.neto))
        .slice(0, 50);

      return res.status(200).json({
        success: true,
        data: {
          tipo,
          rango: { fechaInicio: fechaInicioOk, fechaFin: fechaFinOk },
          restaurantes: restaurantesScope.map((id) => ({
            id,
            nombre: restaurantesMap.get(id) || "Restaurante",
          })),
          resumen,
          detalle: {
            movimientos: movimientosData.map((mov) => ({
              ...mov,
              inventario_nombre: inventarioMap.get(mov.inventario_id)?.nombre || "Producto",
              unidad: inventarioMap.get(mov.inventario_id)?.unidad_medida || "und",
            })),
            resumenPorProducto,
          },
        },
      });
    }

    if (tipo === "caja_auditoria") {
      const { data: cajasData, error: cajasError } = await client
        .from("caja")
        .select(
          "id, restaurante_id, estado, fecha_apertura, fecha_cierre, monto_inicial, monto_final, total_ventas, total_ingresos, total_egresos, estado_cuadre, diferencia_total, diferencia_efectivo, diferencia_pos, diferencia_transferencia, diferencia_gastos"
        )
        .in("restaurante_id", restaurantesScope)
        .gte("fecha_apertura", from)
        .lte("fecha_apertura", to)
        .order("fecha_apertura", { ascending: false })
        .limit(1000);
      if (cajasError) throw cajasError;

      const cajas = (cajasData || []).map((caja) => ({
        ...caja,
        restaurante_nombre: restaurantesMap.get(caja.restaurante_id) || "Restaurante",
      }));

      const resumen = cajas.reduce(
        (acc, caja) => {
          if (caja.estado === "abierta") acc.cajasAbiertas += 1;
          if (caja.estado === "cerrada") acc.cajasCerradas += 1;
          if (caja.estado_cuadre === "descuadrada") acc.cajasDescuadradas += 1;
          acc.diferenciaAcumulada += Number(caja.diferencia_total || 0);
          return acc;
        },
        {
          cajasAbiertas: 0,
          cajasCerradas: 0,
          cajasDescuadradas: 0,
          diferenciaAcumulada: 0,
        }
      );

      return res.status(200).json({
        success: true,
        data: {
          tipo,
          rango: { fechaInicio: fechaInicioOk, fechaFin: fechaFinOk },
          restaurantes: restaurantesScope.map((id) => ({
            id,
            nombre: restaurantesMap.get(id) || "Restaurante",
          })),
          resumen,
          detalle: {
            cajas,
          },
        },
      });
    }

    if (tipo === "rendimiento_cocina") {
      // Query pedidos con timestamps de cocina
      const { data: pedidosCocina, error: cocinaError } = await client
        .from("pedidos")
        .select("id, numero_ticket, tipo_pedido, estado_pedido, created_at, en_preparacion_at, listo_at, entregado_at, mesa")
        .in("restaurante_id", restaurantesScope)
        .gte("created_at", from)
        .lte("created_at", to)
        .in("estado_pedido", ["en_preparacion", "listo", "entregado"])
        .order("created_at", { ascending: false })
        .limit(1000);
      if (cocinaError) throw cocinaError;

      const pedidosCocinaList = (pedidosCocina || []).map((p: any) => {
        const creado = new Date(p.created_at).getTime();
        const listoTime = p.listo_at ? new Date(p.listo_at).getTime() : null;
        const entregadoTime = p.entregado_at ? new Date(p.entregado_at).getTime() : null;
        const preparacionTime = p.en_preparacion_at ? new Date(p.en_preparacion_at).getTime() : null;

        // Minutos de preparación: desde en_preparacion_at (o created_at) hasta listo_at
        const inicioPrep = preparacionTime || creado;
        const minPreparacion = listoTime ? Math.round((listoTime - inicioPrep) / 60000) : null;

        // Minutos totales: desde created_at hasta entregado_at (o listo_at)
        const finTotal = entregadoTime || listoTime;
        const minTotal = finTotal ? Math.round((finTotal - creado) / 60000) : null;

        return {
          id: p.id,
          ticket: p.numero_ticket,
          tipo_pedido: p.tipo_pedido,
          estado: p.estado_pedido,
          mesa: p.mesa,
          hora_entrada: p.created_at,
          hora_preparacion: p.en_preparacion_at,
          hora_listo: p.listo_at,
          hora_entregado: p.entregado_at,
          min_preparacion: minPreparacion,
          min_total: minTotal,
        };
      });

      // Calcular métricas
      const conTiempo = pedidosCocinaList.filter((p: any) => p.min_preparacion !== null);
      const tiempos = conTiempo.map((p: any) => p.min_preparacion as number);
      const promedioPrep = tiempos.length ? tiempos.reduce((a: number, b: number) => a + b, 0) / tiempos.length : 0;
      const maxPrep = tiempos.length ? Math.max(...tiempos) : 0;
      const minPrep = tiempos.length ? Math.min(...tiempos) : 0;

      // Distribución por velocidad
      const rapidos = tiempos.filter((t: number) => t <= 10).length;
      const normales = tiempos.filter((t: number) => t > 10 && t <= 20).length;
      const lentos = tiempos.filter((t: number) => t > 20).length;
      const totalConTiempo = tiempos.length || 1;

      return res.status(200).json({
        success: true,
        data: {
          tipo,
          rango: { fechaInicio: fechaInicioOk, fechaFin: fechaFinOk },
          restaurantes: restaurantesScope.map((id) => ({
            id,
            nombre: restaurantesMap.get(id) || "Restaurante",
          })),
          resumen: {
            totalPedidos: pedidosCocinaList.length,
            pedidosConTiempo: conTiempo.length,
            promedioMinutos: Math.round(promedioPrep * 10) / 10,
            maxMinutos: maxPrep,
            minMinutos: minPrep,
            rapidos,
            normales,
            lentos,
            pctRapidos: Math.round((rapidos / totalConTiempo) * 100),
            pctNormales: Math.round((normales / totalConTiempo) * 100),
            pctLentos: Math.round((lentos / totalConTiempo) * 100),
          },
          detalle: {
            pedidos: pedidosCocinaList,
          },
        },
      });
    }

    const consolidadoRestaurantes = restaurantesScope.map((id) => {
      const pedidosRest = pedidosValidos.filter(
        (p: { restaurante_id: string }) => p.restaurante_id === id
      );
      const gastosRest = (gastosData || []).filter(
        (g: { restaurante_id: string }) => g.restaurante_id === id
      );

      const totalVentas = pedidosRest.reduce(
        (sum: number, p: { total: number | null }) => sum + Number(p.total || 0),
        0
      );
      const totalGastos = gastosRest.reduce(
        (sum: number, g: { monto: number | null }) => sum + Number(g.monto || 0),
        0
      );

      const topProductosRest = Object.values(
        pedidoItemsData.reduce(
          (
            acc: Record<
              string,
              { nombre_menu: string; cantidad: number; total_vendido: number }
            >,
            item
          ) => {
            const restId = pedidoRestaurantMap.get(item.pedido_id);
            if (restId !== id) return acc;
            const key = item.nombre_menu || "Sin nombre";
            if (!acc[key]) {
              acc[key] = { nombre_menu: key, cantidad: 0, total_vendido: 0 };
            }
            acc[key].cantidad += Number(item.cantidad || 0);
            acc[key].total_vendido += Number(item.total_item || 0);
            return acc;
          },
          {}
        )
      )
        .sort((a, b) => b.total_vendido - a.total_vendido)
        .slice(0, 10);

      return {
        restaurante_id: id,
        restaurante_nombre: restaurantesMap.get(id) || "Restaurante",
        pedidos: pedidosRest.length,
        totalVentas,
        totalGastos,
        balance: totalVentas - totalGastos,
        topProductos: topProductosRest,
      };
    });

    const diarioConsolidado = buildDailyResumen(
      pedidosValidos as Array<{
        created_at: string;
        metodo_pago_id?: number | null;
        total: number | null;
      }>,
      (gastosData || []) as Array<{ fecha_gasto?: string | null; monto: number | null }>
    );

    return res.status(200).json({
      success: true,
      data: {
        tipo,
        rango: { fechaInicio: fechaInicioOk, fechaFin: fechaFinOk },
        resumen: {
          totalVentas: ventasTotal,
          totalGastos: gastosTotal,
          balance: ventasTotal - gastosTotal,
          restaurantes: consolidadoRestaurantes.length,
        },
        detalle: {
          restaurantes: consolidadoRestaurantes,
          diario: diarioConsolidado,
          topProductos,
        },
      },
    });
  } catch (error: any) {
    console.error("Error al generar reporte:", error);
    return res.status(500).json({
      success: false,
      message: "Error al generar reporte",
      error: error.message,
    });
  }
};

