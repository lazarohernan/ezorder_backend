import { Request, Response } from 'express';
import { scanSessionStore } from '../stores/scanSessionStore';

export const crearSesion = async (req: Request, res: Response) => {
  if (!req.user_info?.restaurante_id) {
    return res.status(403).json({ ok: false, message: 'No autorizado' });
  }

  const { sessionId, expiresAt } = scanSessionStore.create(req.user_info.restaurante_id);
  res.status(201).json({ ok: true, data: { session_id: sessionId, expires_at: expiresAt } });
};

export const obtenerEstadoSesion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const valid = scanSessionStore.isValid(id);
  res.json({ ok: true, data: { valid } });
};

export const obtenerCodigos = async (req: Request, res: Response) => {
  if (!req.user_info) {
    return res.status(403).json({ ok: false, message: 'No autorizado' });
  }

  const { id } = req.params;
  const codes = scanSessionStore.getCodes(id);

  if (codes === null) {
    return res.status(404).json({ ok: false, message: 'Sesión no encontrada o expirada' });
  }

  res.json({ ok: true, data: { codes } });
};

export const enviarCodigo = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.trim().length === 0 || code.length > 100) {
    return res.status(400).json({ ok: false, message: 'Código inválido (max 100 caracteres)' });
  }

  const added = scanSessionStore.addCode(id, code.trim());

  if (!added) {
    return res.status(404).json({ ok: false, message: 'Sesión no encontrada, expirada o llena' });
  }

  res.json({ ok: true, message: 'Código recibido' });
};

export const cerrarSesion = async (req: Request, res: Response) => {
  if (!req.user_info) {
    return res.status(403).json({ ok: false, message: 'No autorizado' });
  }

  const { id } = req.params;
  scanSessionStore.delete(id);
  res.json({ ok: true, message: 'Sesión cerrada' });
};
