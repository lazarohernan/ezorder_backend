import express, { Request, Response } from "express";
import {
  login,
  checkSession,
  logout,
  register,
  refreshToken,
  checkRefreshToken,
  getUserInfo,
  updatePassword,
} from "../controllers/authController";
import { requireAuth } from "../middlewares/auth";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Público
 */
router.post("/register", register);

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar usuario y obtener token
 * @access  Público
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/session
 * @desc    Verificar si el usuario tiene una sesión activa
 * @access  Público
 */
router.get("/session", checkSession);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión del usuario
 * @access  Privado (requiere autenticación)
 */
router.post("/logout", requireAuth, logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renovar token de autenticación
 * @access  Público (pero requiere refresh_token válido)
 */
router.post("/refresh", refreshToken);

/**
 * @route   POST /api/auth/check-refresh
 * @desc    Verificar si un refresh token es válido
 * @access  Público (pero requiere refresh_token válido)
 */
router.post("/check-refresh", checkRefreshToken);

/**
 * @route   GET /api/auth/user-info
 * @desc    Obtener información extendida del usuario autenticado
 * @access  Privado (requiere autenticación)
 */
router.get("/user-info", requireAuth, getUserInfo);

/**
 * @route   POST /api/auth/update-password
 * @desc    Actualizar contraseña usando access_token de invitación o recuperación
 * @access  Público (pero requiere access_token válido en header)
 */
router.post("/update-password", updatePassword);

export default router;
