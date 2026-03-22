import type { FastifyInstance, HTTPMethods } from "fastify";
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
import {
  createCompatibilityContext,
  parseMultipartRequest,
  runExpressHandlers,
  type ExpressLikeHandler,
} from "./compat";

type RouteDefinition = {
  method: HTTPMethods;
  url: string;
  handlers: ExpressLikeHandler[];
};

const cajaLogger: ExpressLikeHandler = (req, _res, next) => {
  console.log(`[CAJA] ${req.method} ${req.originalUrl}`);
  next?.();
};

const cajaTestRoute: ExpressLikeHandler = (req, res) => {
  const { restaurante_id } = req.params;
  res.json({
    message: "Ruta de prueba funcionando",
    restaurante_id,
    timestamp: new Date().toISOString(),
  });
};

const gastosLogger: ExpressLikeHandler = (req, _res, next) => {
  console.log(`[GASTOS] ${req.method} ${req.originalUrl}`);
  next?.();
};

const gastosTestRoute: ExpressLikeHandler = (req, res) => {
  const { restaurante_id } = req.params;
  res.json({
    message: "Ruta de gastos funcionando",
    restaurante_id,
    timestamp: new Date().toISOString(),
  });
};

const multipartUploadMiddleware: ExpressLikeHandler = async (req, _res, next) => {
  const { body, files } = await parseMultipartRequest(req.__fastifyRequest);
  req.body = {
    ...(req.body || {}),
    ...body,
  };
  req.files = files;
  next?.();
};

const registerRoute = (app: FastifyInstance, route: RouteDefinition) => {
  app.route({
    method: route.method,
    url: route.url,
    handler: async (request, reply) => {
      const context = createCompatibilityContext(request, reply);
      await runExpressHandlers(route.handlers, context);
    },
  });
};

export const registerRoutes = async (app: FastifyInstance) => {
  const routes: RouteDefinition[] = [
    { method: "POST", url: "/api/auth/register", handlers: [register] },
    { method: "POST", url: "/api/auth/login", handlers: [login] },
    { method: "GET", url: "/api/auth/session", handlers: [checkSession] },
    { method: "POST", url: "/api/auth/logout", handlers: [requireAuth, logout] },
    { method: "POST", url: "/api/auth/refresh", handlers: [refreshToken] },
    { method: "POST", url: "/api/auth/check-refresh", handlers: [checkRefreshToken] },
    { method: "GET", url: "/api/auth/user-info", handlers: [requireAuth, getUserInfo] },
    { method: "POST", url: "/api/auth/recover", handlers: [sendPasswordReset] },
    { method: "POST", url: "/api/auth/update-password", handlers: [updatePassword] },

    { method: "GET", url: "/api/restaurantes", handlers: [requireAuth, requirePermissions(["restaurantes.ver"]), getRestaurantes] },
    { method: "GET", url: "/api/restaurantes/:id", handlers: [requireAuth, getRestauranteById] },
    { method: "POST", url: "/api/restaurantes", handlers: [requireAuth, requirePermissions(["restaurantes.crear"]), createRestaurante] },
    { method: "PUT", url: "/api/restaurantes/:id", handlers: [requireAuth, requirePermissions(["restaurantes.editar"]), updateRestaurante] },
    { method: "DELETE", url: "/api/restaurantes/:id", handlers: [requireAuth, requirePermissions(["restaurantes.eliminar"]), deleteRestaurante] },

    { method: "POST", url: "/api/uploads", handlers: [requireAuth, multipartUploadMiddleware, uploadFile] },

    { method: "GET", url: "/api/usuarios/me", handlers: [requireAuth, getCurrentUserInfo] },
    { method: "PUT", url: "/api/usuarios/me", handlers: [requireAuth, updateMyProfile] },
    { method: "GET", url: "/api/usuarios", handlers: [requireAuth, requirePermissions(["usuarios.ver"]), getUsuarios] },
    { method: "GET", url: "/api/usuarios/:id", handlers: [requireAuth, requirePermissions(["usuarios.ver"]), getUsuarioById] },
    { method: "POST", url: "/api/usuarios/invite", handlers: [requireAuth, requirePermissions(["usuarios.crear"]), createInvitacion] },
    { method: "POST", url: "/api/usuarios", handlers: [requireAuth, requirePermissions(["usuarios.crear"]), createUsuario] },
    { method: "PUT", url: "/api/usuarios/:id", handlers: [requireAuth, requirePermissions(["usuarios.editar"]), updateUsuario] },
    { method: "DELETE", url: "/api/usuarios/:id", handlers: [requireAuth, requirePermissions(["usuarios.eliminar"]), deleteUsuario] },

    { method: "GET", url: "/api/roles", handlers: [requireAuth, requirePermissions(["roles.ver"]), getRolesControllerRoles] },
    { method: "GET", url: "/api/roles/:id", handlers: [requireAuth, requirePermissions(["roles.ver"]), getRolesControllerRolById] },
    { method: "POST", url: "/api/roles", handlers: [requireAuth, requirePermissions(["roles.crear"]), createRolesControllerRol] },
    { method: "PUT", url: "/api/roles/:id", handlers: [requireAuth, requirePermissions(["roles.editar"]), updateRolesControllerRol] },
    { method: "DELETE", url: "/api/roles/:id", handlers: [requireAuth, requirePermissions(["roles.eliminar"]), deleteRolesControllerRol] },
    { method: "GET", url: "/api/roles/user/permissions", handlers: [requireAuth, getUserPermissions] },

    { method: "GET", url: "/api/roles-personalizados/permisos", handlers: [requireAuth, requirePermissions(["roles.ver"]), getPermisos] },
    { method: "GET", url: "/api/roles-personalizados", handlers: [requireAuth, requirePermissions(["roles.ver"]), getRolesControllerRoles] },
    { method: "GET", url: "/api/roles-personalizados/:id", handlers: [requireAuth, requirePermissions(["roles.ver"]), getRolesControllerRolById] },
    { method: "POST", url: "/api/roles-personalizados", handlers: [requireAuth, requirePermissions(["roles.crear"]), createRolesControllerRol] },
    { method: "PUT", url: "/api/roles-personalizados/:id", handlers: [requireAuth, requirePermissions(["roles.editar"]), updateRolesControllerRol] },
    { method: "DELETE", url: "/api/roles-personalizados/:id", handlers: [requireAuth, requirePermissions(["roles.eliminar"]), deleteRolesControllerRol] },

    { method: "GET", url: "/api/menu/categories", handlers: [requireAuth, requirePermissions(["categorias.ver", "pedidos.crear"]), getMenuCategories] },
    { method: "POST", url: "/api/menu/categories", handlers: [requireAuth, requirePermissions(["categorias.crear"]), createMenuCategory] },
    { method: "PUT", url: "/api/menu/categories/:id", handlers: [requireAuth, requirePermissions(["categorias.editar"]), updateMenuCategory] },
    { method: "DELETE", url: "/api/menu/categories/:id", handlers: [requireAuth, requirePermissions(["categorias.eliminar"]), deleteMenuCategory] },

    { method: "GET", url: "/api/menu", handlers: [requireAuth, requirePermissions(["menu.ver", "pedidos.crear"]), getMenus] },
    { method: "GET", url: "/api/menu/restaurante/:restaurante_id", handlers: [requireAuth, requirePermissions(["menu.ver", "pedidos.crear"]), getMenusByRestauranteId] },
    { method: "GET", url: "/api/menu/:id", handlers: [requireAuth, requirePermissions(["menu.ver", "pedidos.crear"]), getMenuById] },
    { method: "GET", url: "/api/menu/:id/consumos", handlers: [requireAuth, requirePermissions(["menu.ver"]), getMenuConsumos] },
    { method: "PUT", url: "/api/menu/:id/consumos", handlers: [requireAuth, requirePermissions(["menu.editar"]), updateMenuConsumos] },
    { method: "POST", url: "/api/menu", handlers: [requireAuth, requirePermissions(["menu.crear"]), createMenu] },
    { method: "PUT", url: "/api/menu/:id", handlers: [requireAuth, requirePermissions(["menu.editar"]), updateMenu] },
    { method: "DELETE", url: "/api/menu/:id", handlers: [requireAuth, requirePermissions(["menu.eliminar"]), deleteMenu] },

    { method: "GET", url: "/api/clientes", handlers: [requireAuth, requirePermissions(["clientes.ver", "pedidos.crear"]), getClientes] },
    { method: "GET", url: "/api/clientes/restaurante/:restaurante_id", handlers: [requireAuth, requirePermissions(["clientes.ver", "pedidos.crear"]), getClientesByRestauranteId] },
    { method: "GET", url: "/api/clientes/:id", handlers: [requireAuth, requirePermissions(["clientes.ver", "pedidos.crear"]), getClienteById] },
    { method: "POST", url: "/api/clientes", handlers: [requireAuth, requirePermissions(["clientes.crear", "pedidos.crear"]), createCliente] },
    { method: "PUT", url: "/api/clientes/:id", handlers: [requireAuth, requirePermissions(["clientes.editar"]), updateCliente] },
    { method: "DELETE", url: "/api/clientes/:id", handlers: [requireAuth, requirePermissions(["clientes.eliminar"]), deleteCliente] },

    { method: "GET", url: "/api/pedidos", handlers: [requireAuth, requirePermissions(["pedidos.ver"]), getPedidos] },
    { method: "GET", url: "/api/pedidos/restaurante/:restaurante_id", handlers: [requireAuth, requirePermissions(["pedidos.ver"]), getPedidosByRestauranteId] },
    { method: "GET", url: "/api/pedidos/:id", handlers: [requireAuth, requirePermissions(["pedidos.ver"]), getPedidoById] },
    { method: "POST", url: "/api/pedidos", handlers: [requireAuth, requirePermissions(["pedidos.crear"]), createPedido] },
    { method: "PUT", url: "/api/pedidos/:id", handlers: [requireAuth, requirePermissions(["pedidos.editar"]), updatePedido] },
    { method: "DELETE", url: "/api/pedidos/:id", handlers: [requireAuth, requirePermissions(["pedidos.eliminar"]), deletePedido] },

    { method: "GET", url: "/api/pedido-items", handlers: [requireAuth, requirePermissions(["pedidos.ver"]), getPedidoItems] },
    { method: "GET", url: "/api/pedido-items/pedido/:pedido_id", handlers: [requireAuth, requirePermissions(["pedidos.ver"]), getItemsByPedidoId] },
    { method: "GET", url: "/api/pedido-items/:id", handlers: [requireAuth, requirePermissions(["pedidos.ver"]), getPedidoItemById] },
    { method: "POST", url: "/api/pedido-items", handlers: [requireAuth, requirePermissions(["pedidos.crear"]), createPedidoItem] },
    { method: "POST", url: "/api/pedido-items/batch", handlers: [requireAuth, requirePermissions(["pedidos.crear"]), createPedidoItemsBatch] },
    { method: "PUT", url: "/api/pedido-items/:id", handlers: [requireAuth, requirePermissions(["pedidos.editar"]), updatePedidoItem] },
    { method: "PUT", url: "/api/pedido-items/:id/enviar-cocina", handlers: [requireAuth, requirePermissions(["pedidos.cambiar_estado"]), marcarEnviadoACocina] },
    { method: "DELETE", url: "/api/pedido-items/:id", handlers: [requireAuth, requirePermissions(["pedidos.editar"]), deletePedidoItem] },

    { method: "GET", url: "/api/metodos-pago", handlers: [requireAuth, getMetodosPago] },
    { method: "GET", url: "/api/metodos-pago/:id", handlers: [requireAuth, getMetodoPagoById] },
    { method: "POST", url: "/api/metodos-pago", handlers: [requireAuth, requirePermissions(["dashboard.ver"]), createMetodoPago] },
    { method: "PUT", url: "/api/metodos-pago/:id", handlers: [requireAuth, requirePermissions(["dashboard.ver"]), updateMetodoPago] },
    { method: "DELETE", url: "/api/metodos-pago/:id", handlers: [requireAuth, requirePermissions(["dashboard.ver"]), deleteMetodoPago] },

    { method: "GET", url: "/api/inventario/estadisticas", handlers: [requireAuth, requirePermissions(["inventario.ver"]), obtenerEstadisticas] },
    { method: "GET", url: "/api/inventario/alertas", handlers: [requireAuth, requirePermissions(["inventario.ver", "pedidos.crear"]), obtenerAlertas] },
    { method: "PUT", url: "/api/inventario/alertas/marcar-todas-leidas", handlers: [requireAuth, requirePermissions(["inventario.ver", "pedidos.crear"]), marcarTodasAlertasLeidas] },
    { method: "PUT", url: "/api/inventario/alertas/:id/leer", handlers: [requireAuth, requirePermissions(["inventario.ver", "pedidos.crear"]), marcarAlertaLeida] },
    { method: "DELETE", url: "/api/inventario/alertas/:id", handlers: [requireAuth, requirePermissions(["inventario.ver", "pedidos.crear"]), eliminarAlerta] },
    { method: "GET", url: "/api/inventario/movimientos", handlers: [requireAuth, requirePermissions(["movimientos.ver"]), obtenerMovimientos] },
    { method: "POST", url: "/api/inventario/movimientos", handlers: [requireAuth, requirePermissions(["movimientos.crear"]), crearMovimiento] },
    { method: "GET", url: "/api/inventario/stock-bajo", handlers: [requireAuth, requirePermissions(["inventario.ver"]), obtenerProductosStockBajo] },
    { method: "GET", url: "/api/inventario/verificar-stock/:inventarioId", handlers: [requireAuth, requirePermissions(["inventario.ver"]), verificarStockDisponible] },
    { method: "GET", url: "/api/inventario", handlers: [requireAuth, requirePermissions(["inventario.ver"]), obtenerInventario] },
    { method: "POST", url: "/api/inventario", handlers: [requireAuth, requirePermissions(["inventario.crear"]), crearInventario] },
    { method: "GET", url: "/api/inventario/:id/desglose", handlers: [requireAuth, requirePermissions(["inventario.ver"]), obtenerDesglose] },
    { method: "POST", url: "/api/inventario/:id/desglose", handlers: [requireAuth, requirePermissions(["inventario.editar"]), crearReglaDesglose] },
    { method: "DELETE", url: "/api/inventario/:id/desglose/:reglaId", handlers: [requireAuth, requirePermissions(["inventario.editar"]), eliminarReglaDesglose] },
    { method: "GET", url: "/api/inventario/:id", handlers: [requireAuth, requirePermissions(["inventario.ver"]), obtenerInventarioPorId] },
    { method: "PUT", url: "/api/inventario/:id", handlers: [requireAuth, requirePermissions(["inventario.editar"]), actualizarInventario] },
    { method: "DELETE", url: "/api/inventario/:id", handlers: [requireAuth, requirePermissions(["inventario.eliminar"]), eliminarInventario] },

    { method: "GET", url: "/api/caja/test/:restaurante_id", handlers: [cajaLogger, cajaTestRoute] },
    { method: "GET", url: "/api/caja/all", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.ver"]), requireSuperAdmin, cajaController.getAllCajas] },
    { method: "GET", url: "/api/caja/open", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.ver"]), requireSuperAdmin, cajaController.getAllCajasAbiertas] },
    { method: "GET", url: "/api/caja/restaurante/:restaurante_id", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.ver"]), cajaController.getCajas] },
    { method: "GET", url: "/api/caja/restaurante/:restaurante_id/actual", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.ver", "pedidos.crear", "pedidos.ver"]), cajaController.getCajaActual] },
    { method: "GET", url: "/api/caja/restaurante/:restaurante_id/resumen", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.ver"]), cajaController.getResumenCaja] },
    { method: "GET", url: "/api/caja/:id", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.ver"]), cajaController.getCajaById] },
    { method: "POST", url: "/api/caja/abrir", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.abrir"]), cajaController.abrirCaja] },
    { method: "PUT", url: "/api/caja/:id/cerrar", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.cerrar"]), cajaController.cerrarCaja] },
    { method: "POST", url: "/api/caja/:id/retiro", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.cerrar"]), cajaController.registrarRetiro] },
    { method: "GET", url: "/api/caja/:id/retiros", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.ver"]), cajaController.getRetirosCaja] },
    { method: "DELETE", url: "/api/caja/retiro/:retiro_id", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.cerrar"]), cajaController.eliminarRetiro] },
    { method: "PUT", url: "/api/caja/:id", handlers: [cajaLogger, requireAuth, requirePermissions(["caja.registrar_ingresos"]), cajaController.actualizarCaja] },

    { method: "GET", url: "/api/gastos/test/:restaurante_id", handlers: [gastosLogger, gastosTestRoute] },
    { method: "GET", url: "/api/gastos/restaurante/:restaurante_id", handlers: [gastosLogger, requireAuth, requirePermissions(["gastos.ver"]), gastosController.getGastos] },
    { method: "GET", url: "/api/gastos/restaurante/:restaurante_id/resumen-categoria", handlers: [gastosLogger, requireAuth, requirePermissions(["gastos.ver"]), gastosController.getResumenPorCategoria] },
    { method: "GET", url: "/api/gastos/restaurante/:restaurante_id/total", handlers: [gastosLogger, requireAuth, requirePermissions(["gastos.ver"]), gastosController.getTotalGastos] },
    { method: "GET", url: "/api/gastos/:id", handlers: [gastosLogger, requireAuth, requirePermissions(["gastos.ver"]), gastosController.getGastoById] },
    { method: "POST", url: "/api/gastos", handlers: [gastosLogger, requireAuth, requirePermissions(["gastos.crear"]), gastosController.createGasto] },
    { method: "PUT", url: "/api/gastos/:id", handlers: [gastosLogger, requireAuth, requirePermissions(["gastos.editar"]), gastosController.updateGasto] },
    { method: "DELETE", url: "/api/gastos/:id", handlers: [gastosLogger, requireAuth, requirePermissions(["gastos.eliminar"]), gastosController.deleteGasto] },

    { method: "GET", url: "/api/notificaciones", handlers: [requireAuth, getNotificaciones] },
    { method: "GET", url: "/api/notificaciones/no-leidas/count", handlers: [requireAuth, getNotificacionesNoLeidasCount] },
    { method: "PUT", url: "/api/notificaciones/:id/leida", handlers: [requireAuth, marcarNotificacionLeida] },
    { method: "PUT", url: "/api/notificaciones/marcar-todas-leidas", handlers: [requireAuth, marcarTodasNotificacionesLeidas] },
    { method: "DELETE", url: "/api/notificaciones/:id", handlers: [requireAuth, deleteNotificacion] },

    { method: "POST", url: "/api/invitaciones", handlers: [requireAuth, requirePermissions(["invitaciones.crear"]), createInvitacion] },
    { method: "GET", url: "/api/invitaciones", handlers: [requireAuth, requirePermissions(["invitaciones.ver"]), getInvitaciones] },
    { method: "DELETE", url: "/api/invitaciones/:id", handlers: [requireAuth, requirePermissions(["invitaciones.eliminar"]), deleteInvitacion] },
    { method: "POST", url: "/api/invitaciones/:id/resend", handlers: [requireAuth, requirePermissions(["invitaciones.reenviar"]), resendInvitacion] },

    { method: "GET", url: "/api/descuentos", handlers: [requireAuth, requirePermissions(["descuentos.ver"]), getDescuentos] },
    { method: "GET", url: "/api/descuentos/activos", handlers: [requireAuth, requirePermissions(["descuentos.ver", "pedidos.crear"]), getDescuentosActivos] },
    { method: "GET", url: "/api/descuentos/:id", handlers: [requireAuth, requirePermissions(["descuentos.ver"]), getDescuentoById] },
    { method: "POST", url: "/api/descuentos", handlers: [requireAuth, requirePermissions(["descuentos.crear"]), createDescuento] },
    { method: "PUT", url: "/api/descuentos/:id", handlers: [requireAuth, requirePermissions(["descuentos.editar"]), updateDescuento] },
    { method: "DELETE", url: "/api/descuentos/:id", handlers: [requireAuth, requirePermissions(["descuentos.eliminar"]), deleteDescuento] },

    { method: "GET", url: "/api/unidades-medida", handlers: [requireAuth, requirePermissions(["inventario.ver"]), obtenerUnidadesMedida] },
    { method: "POST", url: "/api/unidades-medida", handlers: [requireAuth, requirePermissions(["inventario.crear"]), crearUnidadMedida] },
    { method: "PUT", url: "/api/unidades-medida/:id", handlers: [requireAuth, requirePermissions(["inventario.editar"]), actualizarUnidadMedida] },
    { method: "DELETE", url: "/api/unidades-medida/:id", handlers: [requireAuth, requirePermissions(["inventario.editar"]), eliminarUnidadMedida] },

    // Sesiones de escaneo (barcode scanner desde celular)
    { method: "POST", url: "/api/scan-sessions", handlers: [requireAuth, crearSesion] },
    { method: "GET", url: "/api/scan-sessions/:id/status", handlers: [obtenerEstadoSesion] },
    { method: "GET", url: "/api/scan-sessions/:id/codes", handlers: [requireAuth, obtenerCodigos] },
    { method: "POST", url: "/api/scan-sessions/:id/codes", handlers: [enviarCodigo] },
    { method: "DELETE", url: "/api/scan-sessions/:id", handlers: [requireAuth, cerrarSesion] },

    { method: "POST", url: "/api/reportes/preview", handlers: [requireAuth, requirePermissions(["reportes.ver"]), previewReporte] },

    { method: "GET", url: "/api/cocina/:restaurante_id", handlers: [requireAuth, requirePermissions(["cocina.ver"]), getPedidosCocina] },

    { method: "GET", url: "/api/facturacion/datos-fiscales/:restaurante_id", handlers: [requireAuth, requirePermissions(["facturacion.ver"]), facturacionController.getDatosFiscales] },
    { method: "POST", url: "/api/facturacion/datos-fiscales", handlers: [requireAuth, requirePermissions(["facturacion.editar"]), facturacionController.createDatosFiscales] },
    { method: "PUT", url: "/api/facturacion/datos-fiscales/:id", handlers: [requireAuth, requirePermissions(["facturacion.editar"]), facturacionController.updateDatosFiscales] },
    { method: "POST", url: "/api/facturacion/facturas/generar", handlers: [requireAuth, requirePermissions(["facturacion.crear"]), facturacionController.generarFactura] },
    { method: "GET", url: "/api/facturacion/facturas/detalle/:id", handlers: [requireAuth, requirePermissions(["facturacion.ver"]), facturacionController.getFacturaDetalle] },
    { method: "GET", url: "/api/facturacion/facturas/:restaurante_id/hoy", handlers: [requireAuth, requirePermissions(["facturacion.ver"]), facturacionController.getFacturasHoy] },
    { method: "GET", url: "/api/facturacion/facturas/:restaurante_id/resumen", handlers: [requireAuth, requirePermissions(["facturacion.ver"]), facturacionController.getResumenDia] },
    { method: "GET", url: "/api/facturacion/facturas/:restaurante_id", handlers: [requireAuth, requirePermissions(["facturacion.ver"]), facturacionController.getFacturas] },
    { method: "PUT", url: "/api/facturacion/facturas/:id/anular", handlers: [requireAuth, requirePermissions(["facturacion.anular"]), facturacionController.anularFactura] },
  ];

  routes.forEach((route) => registerRoute(app, route));
};
