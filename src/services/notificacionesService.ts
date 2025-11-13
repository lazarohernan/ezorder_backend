import { createNotificacion } from '../controllers/notificacionesController';

// Tipos de notificaciones y eventos
export type TipoNotificacion = 'order' | 'system' | 'user' | 'payment' | 'warning' | 'stock' | 'gasto';

export interface NotificacionData {
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  restaurante_id?: string;
  datos_adicionales?: Record<string, unknown>;
  acciones?: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary';
    action: string;
  }>;
}

class NotificacionesService {
  // 📦 PEDIDOS
  async notificarNuevoPedido(pedidoId: string, restauranteId: string, usuarioId?: string) {
    const notificacion: NotificacionData = {
      usuario_id: usuarioId || 'system',
      tipo: 'order',
      titulo: '📦 Nuevo pedido recibido',
      mensaje: `Se ha recibido un nuevo pedido #${pedidoId}`,
      restaurante_id: restauranteId,
      datos_adicionales: { pedido_id: pedidoId },
      acciones: [
        { id: 'view_pedido', label: 'Ver pedido', type: 'primary', action: 'view_order' },
        { id: 'accept_pedido', label: 'Aceptar pedido', type: 'secondary', action: 'accept_order' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarPedidoActualizado(pedidoId: string, estado: string, restauranteId: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'order',
      titulo: '📋 Pedido actualizado',
      mensaje: `El pedido #${pedidoId} ha sido actualizado a: ${estado}`,
      restaurante_id: restauranteId,
      datos_adicionales: { pedido_id: pedidoId, estado: estado },
      acciones: [
        { id: 'view_pedido', label: 'Ver pedido', type: 'primary', action: 'view_order' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarPedidoCancelado(pedidoId: string, motivo: string, restauranteId: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'order',
      titulo: '❌ Pedido cancelado',
      mensaje: `El pedido #${pedidoId} ha sido cancelado: ${motivo}`,
      restaurante_id: restauranteId,
      datos_adicionales: { pedido_id: pedidoId, motivo: motivo },
      acciones: [
        { id: 'view_pedido', label: 'Ver detalles', type: 'primary', action: 'view_order' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  // 📈 INVENTARIO Y STOCK
  async notificarStockBajo(menuId: string, menuNombre: string, restauranteId: string, stockActual: number, stockMinimo: number) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'stock',
      titulo: '⚠️ Stock bajo',
      mensaje: `El producto "${menuNombre}" tiene stock bajo (${stockActual} unidades, mínimo: ${stockMinimo})`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        menu_id: menuId,
        stock_actual: stockActual,
        stock_minimo: stockMinimo
      },
      acciones: [
        { id: 'view_inventario', label: 'Ver inventario', type: 'primary', action: 'view_inventory' },
        { id: 'reponer_stock', label: 'Reponer stock', type: 'secondary', action: 'restock' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarProductoAgotado(menuId: string, menuNombre: string, restauranteId: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'stock',
      titulo: '🚫 Producto agotado',
      mensaje: `El producto "${menuNombre}" se ha agotado completamente`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        menu_id: menuId,
        agotado: true
      },
      acciones: [
        { id: 'view_inventario', label: 'Ver inventario', type: 'primary', action: 'view_inventory' },
        { id: 'reponer_stock', label: 'Reponer stock', type: 'secondary', action: 'restock' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarStockRecargado(menuId: string, menuNombre: string, restauranteId: string, nuevoStock: number) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'stock',
      titulo: '✅ Stock recargado',
      mensaje: `El producto "${menuNombre}" ha sido recargado a ${nuevoStock} unidades`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        menu_id: menuId,
        nuevo_stock: nuevoStock
      },
      acciones: [
        { id: 'view_inventario', label: 'Ver inventario', type: 'primary', action: 'view_inventory' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  // 💰 GASTOS Y FINANZAS
  async notificarNuevoGasto(gastoId: string, monto: number, descripcion: string, restauranteId: string, usuarioId: string) {
    const notificacion: NotificacionData = {
      usuario_id: usuarioId,
      tipo: 'gasto',
      titulo: '💰 Nuevo gasto registrado',
      mensaje: `Se ha registrado un nuevo gasto de $${monto.toFixed(2)}: ${descripcion}`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        gasto_id: gastoId,
        monto: monto
      },
      acciones: [
        { id: 'view_gasto', label: 'Ver gasto', type: 'primary', action: 'view_expense' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarGastoActualizado(gastoId: string, monto: number, restauranteId: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'gasto',
      titulo: '📝 Gasto actualizado',
      mensaje: `Se ha actualizado un gasto por $${monto.toFixed(2)}`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        gasto_id: gastoId,
        monto: monto
      },
      acciones: [
        { id: 'view_gasto', label: 'Ver gasto', type: 'primary', action: 'view_expense' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarPagoRecibido(pedidoId: string, monto: number, metodoPago: string, restauranteId: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'payment',
      titulo: '💳 Pago recibido',
      mensaje: `Se ha recibido un pago de $${monto.toFixed(2)} por el pedido #${pedidoId} (${metodoPago})`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        pedido_id: pedidoId,
        monto: monto,
        metodo_pago: metodoPago
      },
      acciones: [
        { id: 'view_pedido', label: 'Ver pedido', type: 'primary', action: 'view_order' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  // 👤 USUARIOS Y ROLES
  async notificarNuevoUsuario(usuarioId: string, nombreUsuario: string, rol: string, restauranteId?: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'user',
      titulo: '👤 Nuevo usuario registrado',
      mensaje: `Se ha registrado un nuevo ${rol}: ${nombreUsuario}`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        usuario_id: usuarioId,
        rol: rol
      },
      acciones: [
        { id: 'view_usuario', label: 'Ver usuario', type: 'primary', action: 'view_user' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarUsuarioActualizado(usuarioId: string, nombreUsuario: string, cambios: string[]) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'user',
      titulo: '🔄 Usuario actualizado',
      mensaje: `El usuario "${nombreUsuario}" ha sido actualizado: ${cambios.join(', ')}`,
      datos_adicionales: { 
        usuario_id: usuarioId,
        cambios: cambios
      },
      acciones: [
        { id: 'view_usuario', label: 'Ver usuario', type: 'primary', action: 'view_user' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  // 🖥️ SISTEMA
  async notificarActualizacionSistema(version: string, cambios: string[]) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'system',
      titulo: '🔄 Actualización del sistema',
      mensaje: `El sistema EZ ORDER ha sido actualizado a la versión ${version}`,
      datos_adicionales: { 
        version: version,
        cambios: cambios
      },
      acciones: [
        { id: 'view_changes', label: 'Ver cambios', type: 'primary', action: 'view_changes' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarMantenimientoProgramado(fecha: string, duracion: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'system',
      titulo: '🔧 Mantenimiento programado',
      mensaje: `El sistema estará en mantenimiento el ${fecha} por ${duracion}`,
      datos_adicionales: { 
        fecha: fecha,
        duracion: duracion
      },
      acciones: [
        { id: 'view_details', label: 'Ver detalles', type: 'primary', action: 'view_maintenance' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  // ⚠️ ADVERTENCIAS Y ALERTAS
  async notificarAdvertencia(titulo: string, mensaje: string, restauranteId?: string, acciones?: any[]) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'warning',
      titulo: `⚠️ ${titulo}`,
      mensaje,
      restaurante_id: restauranteId,
      datos_adicionales: { tipo: 'advertencia' },
      acciones
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarErrorCritico(servicio: string, error: string, restauranteId?: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'warning',
      titulo: '🚨 Error crítico',
      mensaje: `Error en ${servicio}: ${error}`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        servicio: servicio,
        error: error,
        critico: true
      },
      acciones: [
        { id: 'view_logs', label: 'Ver logs', type: 'primary', action: 'view_logs' },
        { id: 'report_error', label: 'Reportar error', type: 'secondary', action: 'report_error' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  // 📊 REPORTES Y ESTADÍSTICAS
  async notificarReporteGenerado(tipoReporte: string, periodo: string, restauranteId?: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'system',
      titulo: '📊 Reporte generado',
      mensaje: `Se ha generado el reporte ${tipoReporte} del período ${periodo}`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        tipo_reporte: tipoReporte,
        periodo: periodo
      },
      acciones: [
        { id: 'view_report', label: 'Ver reporte', type: 'primary', action: 'view_report' },
        { id: 'download_report', label: 'Descargar', type: 'secondary', action: 'download_report' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }

  async notificarMetaAlcanzada(meta: string, valor: number, objetivo: number, restauranteId?: string) {
    const notificacion: NotificacionData = {
      usuario_id: 'system',
      tipo: 'system',
      titulo: '🎯 Meta alcanzada',
      mensaje: `¡Felicidades! Has alcanzado la meta de ${meta}: ${valor}/${objetivo}`,
      restaurante_id: restauranteId,
      datos_adicionales: { 
        meta: meta,
        valor: valor,
        objetivo: objetivo
      },
      acciones: [
        { id: 'view_stats', label: 'Ver estadísticas', type: 'primary', action: 'view_stats' }
      ]
    };

    return await createNotificacion(
      notificacion.usuario_id,
      notificacion.tipo,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.restaurante_id,
      notificacion.datos_adicionales,
      notificacion.acciones
    );
  }
}

export default new NotificacionesService();
