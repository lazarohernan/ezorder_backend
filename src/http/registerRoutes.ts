import type { FastifyInstance, FastifyReply, FastifyRequest, HTTPMethods } from "fastify";
import {
  checkRefreshToken,
  checkSession,
  getUserInfo,
  login,
  logout,
  refreshToken,
  register,
  sendPasswordReset,
  updatePassword,
} from "../controllers/authController";
import { cajaController } from "../controllers/cajaController";
import {
  createCliente,
  deleteCliente,
  getClienteById,
  getClientes,
  getClientesByRestauranteId,
  updateCliente,
} from "../controllers/clienteController";
import { getPedidosCocina } from "../controllers/cocinaController";
import {
  createDescuento,
  deleteDescuento,
  getDescuentoById,
  getDescuentos,
  getDescuentosActivos,
  updateDescuento,
} from "../controllers/descuentoController";
import { facturacionController } from "../controllers/facturacionController";
import { gastosController } from "../controllers/gastosController";
import {
  crearInventario,
  crearMovimiento,
  crearReglaDesglose,
  actualizarInventario,
  eliminarAlerta,
  eliminarInventario,
  eliminarReglaDesglose,
  marcarAlertaLeida,
  marcarTodasAlertasLeidas,
  obtenerAlertas,
  obtenerDesglose,
  obtenerEstadisticas,
  obtenerInventario,
  obtenerInventarioPorId,
  obtenerMovimientos,
  obtenerProductosStockBajo,
  verificarStockDisponible,
} from "../controllers/inventarioController";
import {
  createInvitacion,
  deleteInvitacion,
  getInvitaciones,
  resendInvitacion,
} from "../controllers/invitacionController";
import {
  createMenuCategory,
  deleteMenuCategory,
  getMenuCategories,
  updateMenuCategory,
} from "../controllers/menuCategoriesController";
import {
  createMenu,
  deleteMenu,
  getMenuById,
  getMenuConsumos,
  getMenus,
  getMenusByRestauranteId,
  updateMenu,
  updateMenuConsumos,
} from "../controllers/menuController";
import {
  createMetodoPago,
  deleteMetodoPago,
  getMetodoPagoById,
  getMetodosPago,
  updateMetodoPago,
} from "../controllers/metodoPagoController";
import {
  deleteNotificacion,
  getNotificaciones,
  getNotificacionesNoLeidasCount,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../controllers/notificacionesController";
import {
  createPedido,
  deletePedido,
  getPedidoById,
  getPedidos,
  getPedidosByRestauranteId,
  updatePedido,
} from "../controllers/pedidoController";
import {
  createPedidoItem,
  createPedidoItemsBatch,
  deletePedidoItem,
  getItemsByPedidoId,
  getPedidoItemById,
  getPedidoItems,
  marcarEnviadoACocina,
  updatePedidoItem,
} from "../controllers/pedidoItemController";
import { previewReporte } from "../controllers/reportesController";
import {
  createRestaurante,
  deleteRestaurante,
  getRestauranteById,
  getRestaurantes,
  updateRestaurante,
} from "../controllers/restauranteController";
import {
  createRol as createRolesControllerRol,
  deleteRol as deleteRolesControllerRol,
  getPermisos,
  getRolById as getRolesControllerRolById,
  getRoles as getRolesControllerRoles,
  updateRol as updateRolesControllerRol,
  getUserPermissions,
} from "../controllers/rolesController";
import { uploadFile } from "../controllers/uploadsController";
import {
  actualizarUnidadMedida,
  crearUnidadMedida,
  eliminarUnidadMedida,
  obtenerUnidadesMedida,
} from "../controllers/unidadesMedidaController";
import {
  crearSesion,
  obtenerEstadoSesion,
  obtenerCodigos,
  enviarCodigo,
  cerrarSesion,
} from "../controllers/scanSessionController";
import {
  createUsuario,
  deleteUsuario,
  getCurrentUserInfo,
  getUsuarioById,
  getUsuarios,
  updateUsuario,
  updateMyProfile,
} from "../controllers/usuarioController";
import { requireAuth } from "../middlewares/auth";
import {
  requirePermissions,
  requireSuperAdmin,
} from "../middlewares/permissions";
import { parseMultipartRequest } from "../utils/multipart";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PreHandler = (request: any, reply: any) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (request: any, reply: any) => Promise<any>;

type RouteDefinition = {
  method: HTTPMethods;
  url: string;
  preHandler?: PreHandler[];
  handler: Handler;
};

const cajaLogger = async (request: FastifyRequest, _reply: FastifyReply) => {
  console.log(`[CAJA] ${request.method} ${request.url}`);
};

const gastosLogger = async (request: FastifyRequest, _reply: FastifyReply) => {
  console.log(`[GASTOS] ${request.method} ${request.url}`);
};

const multipartPreHandler = async (request: FastifyRequest, _reply: FastifyReply) => {
  const { body, files } = await parseMultipartRequest(request);
  request.body = { ...(request.body as object || {}), ...body } as any;
  if (files) (request as any).files = files;
};

const registerRoute = (app: FastifyInstance, route: RouteDefinition) => {
  app.route({
    method: route.method,
    url: route.url,
    preHandler: route.preHandler,
    handler: route.handler,
  });
};

export const registerRoutes = async (app: FastifyInstance) => {
  const routes: RouteDefinition[] = [
    { method: "POST", url: "/api/auth/register", handler: register },
    { method: "POST", url: "/api/auth/login", handler: login },
    { method: "GET", url: "/api/auth/session", handler: checkSession },
    { method: "POST", url: "/api/auth/logout", preHandler: [requireAuth], handler: logout },
    { method: "POST", url: "/api/auth/refresh", handler: refreshToken },
    { method: "POST", url: "/api/auth/check-refresh", handler: checkRefreshToken },
    { method: "GET", url: "/api/auth/user-info", preHandler: [requireAuth], handler: getUserInfo },
    { method: "POST", url: "/api/auth/recover", handler: sendPasswordReset },
    { method: "POST", url: "/api/auth/update-password", handler: updatePassword },

    { method: "GET", url: "/api/restaurantes", preHandler: [requireAuth], handler: getRestaurantes },
    { method: "GET", url: "/api/restaurantes/:id", preHandler: [requireAuth], handler: getRestauranteById },
    { method: "POST", url: "/api/restaurantes", preHandler: [requireAuth, requirePermissions(["restaurantes.crear"])], handler: createRestaurante },
    { method: "PUT", url: "/api/restaurantes/:id", preHandler: [requireAuth, requirePermissions(["restaurantes.editar"])], handler: updateRestaurante },
    { method: "DELETE", url: "/api/restaurantes/:id", preHandler: [requireAuth, requirePermissions(["restaurantes.eliminar"])], handler: deleteRestaurante },

    { method: "POST", url: "/api/uploads", preHandler: [requireAuth, multipartPreHandler], handler: uploadFile },

    { method: "GET", url: "/api/usuarios/me", preHandler: [requireAuth], handler: getCurrentUserInfo },
    { method: "PUT", url: "/api/usuarios/me", preHandler: [requireAuth], handler: updateMyProfile },
    { method: "GET", url: "/api/usuarios", preHandler: [requireAuth, requirePermissions(["usuarios.ver"])], handler: getUsuarios },
    { method: "GET", url: "/api/usuarios/:id", preHandler: [requireAuth, requirePermissions(["usuarios.ver"])], handler: getUsuarioById },
    { method: "POST", url: "/api/usuarios/invite", preHandler: [requireAuth, requirePermissions(["usuarios.crear"])], handler: createInvitacion },
    { method: "POST", url: "/api/usuarios", preHandler: [requireAuth, requirePermissions(["usuarios.crear"])], handler: createUsuario },
    { method: "PUT", url: "/api/usuarios/:id", preHandler: [requireAuth, requirePermissions(["usuarios.editar"])], handler: updateUsuario },
    { method: "DELETE", url: "/api/usuarios/:id", preHandler: [requireAuth, requirePermissions(["usuarios.eliminar"])], handler: deleteUsuario },

    { method: "GET", url: "/api/roles", preHandler: [requireAuth, requirePermissions(["roles.ver"])], handler: getRolesControllerRoles },
    { method: "GET", url: "/api/roles/:id", preHandler: [requireAuth, requirePermissions(["roles.ver"])], handler: getRolesControllerRolById },
    { method: "POST", url: "/api/roles", preHandler: [requireAuth, requirePermissions(["roles.crear"])], handler: createRolesControllerRol },
    { method: "PUT", url: "/api/roles/:id", preHandler: [requireAuth, requirePermissions(["roles.editar"])], handler: updateRolesControllerRol },
    { method: "DELETE", url: "/api/roles/:id", preHandler: [requireAuth, requirePermissions(["roles.eliminar"])], handler: deleteRolesControllerRol },
    { method: "GET", url: "/api/roles/user/permissions", preHandler: [requireAuth], handler: getUserPermissions },

    { method: "GET", url: "/api/roles-personalizados/permisos", preHandler: [requireAuth, requirePermissions(["roles.ver"])], handler: getPermisos },
    { method: "GET", url: "/api/roles-personalizados", preHandler: [requireAuth, requirePermissions(["roles.ver"])], handler: getRolesControllerRoles },
    { method: "GET", url: "/api/roles-personalizados/:id", preHandler: [requireAuth, requirePermissions(["roles.ver"])], handler: getRolesControllerRolById },
    { method: "POST", url: "/api/roles-personalizados", preHandler: [requireAuth, requirePermissions(["roles.crear"])], handler: createRolesControllerRol },
    { method: "PUT", url: "/api/roles-personalizados/:id", preHandler: [requireAuth, requirePermissions(["roles.editar"])], handler: updateRolesControllerRol },
    { method: "DELETE", url: "/api/roles-personalizados/:id", preHandler: [requireAuth, requirePermissions(["roles.eliminar"])], handler: deleteRolesControllerRol },

    { method: "GET", url: "/api/menu/categories", preHandler: [requireAuth, requirePermissions(["categorias.ver", "pedidos.crear"])], handler: getMenuCategories },
    { method: "POST", url: "/api/menu/categories", preHandler: [requireAuth, requirePermissions(["categorias.crear"])], handler: createMenuCategory },
    { method: "PUT", url: "/api/menu/categories/:id", preHandler: [requireAuth, requirePermissions(["categorias.editar"])], handler: updateMenuCategory },
    { method: "DELETE", url: "/api/menu/categories/:id", preHandler: [requireAuth, requirePermissions(["categorias.eliminar"])], handler: deleteMenuCategory },

    { method: "GET", url: "/api/menu", preHandler: [requireAuth, requirePermissions(["menu.ver", "pedidos.crear"])], handler: getMenus },
    { method: "GET", url: "/api/menu/restaurante/:restaurante_id", preHandler: [requireAuth, requirePermissions(["menu.ver", "pedidos.crear"])], handler: getMenusByRestauranteId },
    { method: "GET", url: "/api/menu/:id", preHandler: [requireAuth, requirePermissions(["menu.ver", "pedidos.crear"])], handler: getMenuById },
    { method: "GET", url: "/api/menu/:id/consumos", preHandler: [requireAuth, requirePermissions(["menu.ver"])], handler: getMenuConsumos },
    { method: "PUT", url: "/api/menu/:id/consumos", preHandler: [requireAuth, requirePermissions(["menu.editar"])], handler: updateMenuConsumos },
    { method: "POST", url: "/api/menu", preHandler: [requireAuth, requirePermissions(["menu.crear"])], handler: createMenu },
    { method: "PUT", url: "/api/menu/:id", preHandler: [requireAuth, requirePermissions(["menu.editar"])], handler: updateMenu },
    { method: "DELETE", url: "/api/menu/:id", preHandler: [requireAuth, requirePermissions(["menu.eliminar"])], handler: deleteMenu },

    { method: "GET", url: "/api/clientes", preHandler: [requireAuth, requirePermissions(["clientes.ver", "pedidos.crear"])], handler: getClientes },
    { method: "GET", url: "/api/clientes/restaurante/:restaurante_id", preHandler: [requireAuth, requirePermissions(["clientes.ver", "pedidos.crear"])], handler: getClientesByRestauranteId },
    { method: "GET", url: "/api/clientes/:id", preHandler: [requireAuth, requirePermissions(["clientes.ver", "pedidos.crear"])], handler: getClienteById },
    { method: "POST", url: "/api/clientes", preHandler: [requireAuth, requirePermissions(["clientes.crear", "pedidos.crear"])], handler: createCliente },
    { method: "PUT", url: "/api/clientes/:id", preHandler: [requireAuth, requirePermissions(["clientes.editar"])], handler: updateCliente },
    { method: "DELETE", url: "/api/clientes/:id", preHandler: [requireAuth, requirePermissions(["clientes.eliminar"])], handler: deleteCliente },

    { method: "GET", url: "/api/pedidos", preHandler: [requireAuth, requirePermissions(["pedidos.ver"])], handler: getPedidos },
    { method: "GET", url: "/api/pedidos/restaurante/:restaurante_id", preHandler: [requireAuth, requirePermissions(["pedidos.ver"])], handler: getPedidosByRestauranteId },
    { method: "GET", url: "/api/pedidos/:id", preHandler: [requireAuth, requirePermissions(["pedidos.ver"])], handler: getPedidoById },
    { method: "POST", url: "/api/pedidos", preHandler: [requireAuth, requirePermissions(["pedidos.crear"])], handler: createPedido },
    { method: "PUT", url: "/api/pedidos/:id", preHandler: [requireAuth, requirePermissions(["pedidos.editar"])], handler: updatePedido },
    { method: "DELETE", url: "/api/pedidos/:id", preHandler: [requireAuth, requirePermissions(["pedidos.eliminar", "pedidos.crear"])], handler: deletePedido },

    { method: "GET", url: "/api/pedido-items", preHandler: [requireAuth, requirePermissions(["pedidos.ver"])], handler: getPedidoItems },
    { method: "GET", url: "/api/pedido-items/pedido/:pedido_id", preHandler: [requireAuth, requirePermissions(["pedidos.ver"])], handler: getItemsByPedidoId },
    { method: "GET", url: "/api/pedido-items/:id", preHandler: [requireAuth, requirePermissions(["pedidos.ver"])], handler: getPedidoItemById },
    { method: "POST", url: "/api/pedido-items", preHandler: [requireAuth, requirePermissions(["pedidos.crear"])], handler: createPedidoItem },
    { method: "POST", url: "/api/pedido-items/batch", preHandler: [requireAuth, requirePermissions(["pedidos.crear"])], handler: createPedidoItemsBatch },
    { method: "PUT", url: "/api/pedido-items/:id", preHandler: [requireAuth, requirePermissions(["pedidos.editar"])], handler: updatePedidoItem },
    { method: "PUT", url: "/api/pedido-items/:id/enviar-cocina", preHandler: [requireAuth, requirePermissions(["pedidos.cambiar_estado"])], handler: marcarEnviadoACocina },
    { method: "DELETE", url: "/api/pedido-items/:id", preHandler: [requireAuth, requirePermissions(["pedidos.editar"])], handler: deletePedidoItem },

    { method: "GET", url: "/api/metodos-pago", preHandler: [requireAuth], handler: getMetodosPago },
    { method: "GET", url: "/api/metodos-pago/:id", preHandler: [requireAuth], handler: getMetodoPagoById },
    { method: "POST", url: "/api/metodos-pago", preHandler: [requireAuth, requirePermissions(["dashboard.ver"])], handler: createMetodoPago },
    { method: "PUT", url: "/api/metodos-pago/:id", preHandler: [requireAuth, requirePermissions(["dashboard.ver"])], handler: updateMetodoPago },
    { method: "DELETE", url: "/api/metodos-pago/:id", preHandler: [requireAuth, requirePermissions(["dashboard.ver"])], handler: deleteMetodoPago },

    { method: "GET", url: "/api/inventario/estadisticas", preHandler: [requireAuth, requirePermissions(["inventario.ver"])], handler: obtenerEstadisticas },
    { method: "GET", url: "/api/inventario/alertas", preHandler: [requireAuth, requirePermissions(["inventario.ver", "pedidos.crear"])], handler: obtenerAlertas },
    { method: "PUT", url: "/api/inventario/alertas/marcar-todas-leidas", preHandler: [requireAuth, requirePermissions(["inventario.ver", "pedidos.crear"])], handler: marcarTodasAlertasLeidas },
    { method: "PUT", url: "/api/inventario/alertas/:id/leer", preHandler: [requireAuth, requirePermissions(["inventario.ver", "pedidos.crear"])], handler: marcarAlertaLeida },
    { method: "DELETE", url: "/api/inventario/alertas/:id", preHandler: [requireAuth, requirePermissions(["inventario.ver", "pedidos.crear"])], handler: eliminarAlerta },
    { method: "GET", url: "/api/inventario/movimientos", preHandler: [requireAuth, requirePermissions(["movimientos.ver"])], handler: obtenerMovimientos },
    { method: "POST", url: "/api/inventario/movimientos", preHandler: [requireAuth, requirePermissions(["movimientos.crear"])], handler: crearMovimiento },
    { method: "GET", url: "/api/inventario/stock-bajo", preHandler: [requireAuth, requirePermissions(["inventario.ver"])], handler: obtenerProductosStockBajo },
    { method: "GET", url: "/api/inventario/verificar-stock/:inventarioId", preHandler: [requireAuth, requirePermissions(["inventario.ver"])], handler: verificarStockDisponible },
    { method: "GET", url: "/api/inventario", preHandler: [requireAuth, requirePermissions(["inventario.ver"])], handler: obtenerInventario },
    { method: "POST", url: "/api/inventario", preHandler: [requireAuth, requirePermissions(["inventario.crear"])], handler: crearInventario },
    { method: "GET", url: "/api/inventario/:id/desglose", preHandler: [requireAuth, requirePermissions(["inventario.ver"])], handler: obtenerDesglose },
    { method: "POST", url: "/api/inventario/:id/desglose", preHandler: [requireAuth, requirePermissions(["inventario.editar"])], handler: crearReglaDesglose },
    { method: "DELETE", url: "/api/inventario/:id/desglose/:reglaId", preHandler: [requireAuth, requirePermissions(["inventario.editar"])], handler: eliminarReglaDesglose },
    { method: "GET", url: "/api/inventario/:id", preHandler: [requireAuth, requirePermissions(["inventario.ver"])], handler: obtenerInventarioPorId },
    { method: "PUT", url: "/api/inventario/:id", preHandler: [requireAuth, requirePermissions(["inventario.editar"])], handler: actualizarInventario },
    { method: "DELETE", url: "/api/inventario/:id", preHandler: [requireAuth, requirePermissions(["inventario.eliminar"])], handler: eliminarInventario },

    { method: "GET", url: "/api/caja/all", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.historial"]), requireSuperAdmin], handler: cajaController.getAllCajas },
    { method: "GET", url: "/api/caja/open", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.historial"]), requireSuperAdmin], handler: cajaController.getAllCajasAbiertas },
    { method: "GET", url: "/api/caja/restaurante/:restaurante_id", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.historial", "caja.ver"])], handler: cajaController.getCajas },
    { method: "GET", url: "/api/caja/restaurante/:restaurante_id/actual", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.ver", "pedidos.crear", "pedidos.ver"])], handler: cajaController.getCajaActual },
    { method: "GET", url: "/api/caja/restaurante/:restaurante_id/resumen", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.ver"])], handler: cajaController.getResumenCaja },
    { method: "GET", url: "/api/caja/:id", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.ver"])], handler: cajaController.getCajaById },
    { method: "POST", url: "/api/caja/abrir", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.abrir"])], handler: cajaController.abrirCaja },
    { method: "PUT", url: "/api/caja/:id/cerrar", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.cerrar"])], handler: cajaController.cerrarCaja },
    { method: "POST", url: "/api/caja/:id/retiro", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.cerrar"])], handler: cajaController.registrarRetiro },
    { method: "GET", url: "/api/caja/:id/retiros", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.ver"])], handler: cajaController.getRetirosCaja },
    { method: "DELETE", url: "/api/caja/retiro/:retiro_id", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.cerrar"])], handler: cajaController.eliminarRetiro },
    { method: "PUT", url: "/api/caja/:id", preHandler: [cajaLogger, requireAuth, requirePermissions(["caja.registrar_ingresos"])], handler: cajaController.actualizarCaja },

    { method: "GET", url: "/api/gastos/restaurante/:restaurante_id", preHandler: [gastosLogger, requireAuth, requirePermissions(["gastos.ver"])], handler: gastosController.getGastos },
    { method: "GET", url: "/api/gastos/restaurante/:restaurante_id/resumen-categoria", preHandler: [gastosLogger, requireAuth, requirePermissions(["gastos.ver"])], handler: gastosController.getResumenPorCategoria },
    { method: "GET", url: "/api/gastos/restaurante/:restaurante_id/total", preHandler: [gastosLogger, requireAuth, requirePermissions(["gastos.ver"])], handler: gastosController.getTotalGastos },
    { method: "GET", url: "/api/gastos/:id", preHandler: [gastosLogger, requireAuth, requirePermissions(["gastos.ver"])], handler: gastosController.getGastoById },
    { method: "POST", url: "/api/gastos", preHandler: [gastosLogger, requireAuth, requirePermissions(["gastos.crear"])], handler: gastosController.createGasto },
    { method: "PUT", url: "/api/gastos/:id", preHandler: [gastosLogger, requireAuth, requirePermissions(["gastos.editar"])], handler: gastosController.updateGasto },
    { method: "DELETE", url: "/api/gastos/:id", preHandler: [gastosLogger, requireAuth, requirePermissions(["gastos.eliminar"])], handler: gastosController.deleteGasto },

    { method: "GET", url: "/api/notificaciones", preHandler: [requireAuth], handler: getNotificaciones },
    { method: "GET", url: "/api/notificaciones/no-leidas/count", preHandler: [requireAuth], handler: getNotificacionesNoLeidasCount },
    { method: "PUT", url: "/api/notificaciones/:id/leida", preHandler: [requireAuth], handler: marcarNotificacionLeida },
    { method: "PUT", url: "/api/notificaciones/marcar-todas-leidas", preHandler: [requireAuth], handler: marcarTodasNotificacionesLeidas },
    { method: "DELETE", url: "/api/notificaciones/:id", preHandler: [requireAuth], handler: deleteNotificacion },

    { method: "POST", url: "/api/invitaciones", preHandler: [requireAuth, requirePermissions(["invitaciones.crear"])], handler: createInvitacion },
    { method: "GET", url: "/api/invitaciones", preHandler: [requireAuth, requirePermissions(["invitaciones.ver"])], handler: getInvitaciones },
    { method: "DELETE", url: "/api/invitaciones/:id", preHandler: [requireAuth, requirePermissions(["invitaciones.eliminar"])], handler: deleteInvitacion },
    { method: "POST", url: "/api/invitaciones/:id/resend", preHandler: [requireAuth, requirePermissions(["invitaciones.reenviar"])], handler: resendInvitacion },

    { method: "GET", url: "/api/descuentos", preHandler: [requireAuth, requirePermissions(["descuentos.ver"])], handler: getDescuentos },
    { method: "GET", url: "/api/descuentos/activos", preHandler: [requireAuth, requirePermissions(["descuentos.ver", "pedidos.crear"])], handler: getDescuentosActivos },
    { method: "GET", url: "/api/descuentos/:id", preHandler: [requireAuth, requirePermissions(["descuentos.ver"])], handler: getDescuentoById },
    { method: "POST", url: "/api/descuentos", preHandler: [requireAuth, requirePermissions(["descuentos.crear"])], handler: createDescuento },
    { method: "PUT", url: "/api/descuentos/:id", preHandler: [requireAuth, requirePermissions(["descuentos.editar"])], handler: updateDescuento },
    { method: "DELETE", url: "/api/descuentos/:id", preHandler: [requireAuth, requirePermissions(["descuentos.eliminar"])], handler: deleteDescuento },

    { method: "GET", url: "/api/unidades-medida", preHandler: [requireAuth, requirePermissions(["inventario.ver"])], handler: obtenerUnidadesMedida },
    { method: "POST", url: "/api/unidades-medida", preHandler: [requireAuth, requirePermissions(["inventario.crear"])], handler: crearUnidadMedida },
    { method: "PUT", url: "/api/unidades-medida/:id", preHandler: [requireAuth, requirePermissions(["inventario.editar"])], handler: actualizarUnidadMedida },
    { method: "DELETE", url: "/api/unidades-medida/:id", preHandler: [requireAuth, requirePermissions(["inventario.editar"])], handler: eliminarUnidadMedida },

    // Sesiones de escaneo (barcode scanner desde celular)
    { method: "POST", url: "/api/scan-sessions", preHandler: [requireAuth], handler: crearSesion },
    { method: "GET", url: "/api/scan-sessions/:id/status", handler: obtenerEstadoSesion },
    { method: "GET", url: "/api/scan-sessions/:id/codes", preHandler: [requireAuth], handler: obtenerCodigos },
    { method: "POST", url: "/api/scan-sessions/:id/codes", handler: enviarCodigo },
    { method: "DELETE", url: "/api/scan-sessions/:id", preHandler: [requireAuth], handler: cerrarSesion },

    { method: "POST", url: "/api/reportes/preview", preHandler: [requireAuth, requirePermissions(["reportes.ver"])], handler: previewReporte },

    { method: "GET", url: "/api/cocina/:restaurante_id", preHandler: [requireAuth, requirePermissions(["cocina.ver"])], handler: getPedidosCocina },

    { method: "GET", url: "/api/facturacion/datos-fiscales/:restaurante_id", preHandler: [requireAuth, requirePermissions(["facturacion.ver", "pedidos.crear"])], handler: facturacionController.getDatosFiscales },
    { method: "POST", url: "/api/facturacion/datos-fiscales", preHandler: [requireAuth, requirePermissions(["facturacion.editar"])], handler: facturacionController.createDatosFiscales },
    { method: "PUT", url: "/api/facturacion/datos-fiscales/:id", preHandler: [requireAuth, requirePermissions(["facturacion.editar"])], handler: facturacionController.updateDatosFiscales },
    { method: "POST", url: "/api/facturacion/facturas/generar", preHandler: [requireAuth, requirePermissions(["facturacion.crear", "pedidos.crear"])], handler: facturacionController.generarFactura },
    { method: "GET", url: "/api/facturacion/facturas/detalle/:id", preHandler: [requireAuth, requirePermissions(["facturacion.ver"])], handler: facturacionController.getFacturaDetalle },
    { method: "GET", url: "/api/facturacion/facturas/:restaurante_id/hoy", preHandler: [requireAuth, requirePermissions(["facturacion.ver"])], handler: facturacionController.getFacturasHoy },
    { method: "GET", url: "/api/facturacion/facturas/:restaurante_id/resumen", preHandler: [requireAuth, requirePermissions(["facturacion.ver"])], handler: facturacionController.getResumenDia },
    { method: "GET", url: "/api/facturacion/facturas/:restaurante_id", preHandler: [requireAuth, requirePermissions(["facturacion.ver"])], handler: facturacionController.getFacturas },
    { method: "PUT", url: "/api/facturacion/facturas/:id/anular", preHandler: [requireAuth, requirePermissions(["facturacion.anular"])], handler: facturacionController.anularFactura },
  ];

  routes.forEach((route) => registerRoute(app, route));
};
