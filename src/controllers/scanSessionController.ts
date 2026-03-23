import type { FastifyRequest, FastifyReply } from 'fastify';
import { scanSessionStore } from '../stores/scanSessionStore';

export const crearSesion = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user_info?.restaurante_id) {
    return reply.code(403).send({ ok: false, message: 'No autorizado' });
  }

  const { sessionId, expiresAt } = scanSessionStore.create(request.user_info.restaurante_id);
  return reply.code(201).send({ ok: true, data: { session_id: sessionId, expires_at: expiresAt } });
};

export const obtenerEstadoSesion = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const valid = scanSessionStore.isValid(id);
  reply.send({ ok: true, data: { valid } });
};

export const obtenerCodigos = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user_info) {
    return reply.code(403).send({ ok: false, message: 'No autorizado' });
  }

  const { id } = request.params as { id: string };
  const codes = scanSessionStore.getCodes(id);

  if (codes === null) {
    return reply.code(404).send({ ok: false, message: 'Sesión no encontrada o expirada' });
  }

  reply.send({ ok: true, data: { codes } });
};

export const enviarCodigo = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const { code } = request.body as { code?: string };

  if (!code || typeof code !== 'string' || code.trim().length === 0 || code.length > 100) {
    return reply.code(400).send({ ok: false, message: 'Código inválido (max 100 caracteres)' });
  }

  const added = scanSessionStore.addCode(id, code.trim());

  if (!added) {
    return reply.code(404).send({ ok: false, message: 'Sesión no encontrada, expirada o llena' });
  }

  reply.send({ ok: true, message: 'Código recibido' });
};

export const cerrarSesion = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user_info) {
    return reply.code(403).send({ ok: false, message: 'No autorizado' });
  }

  const { id } = request.params as { id: string };
  scanSessionStore.delete(id);
  reply.send({ ok: true, message: 'Sesión cerrada' });
};
