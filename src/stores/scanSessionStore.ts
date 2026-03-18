import { v4 as uuidv4 } from 'uuid';

interface ScanSession {
  sessionId: string;
  restauranteId: string;
  codes: string[];
  createdAt: Date;
  expiresAt: Date;
}

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutos
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_CODES_PER_SESSION = 30;

const sessions = new Map<string, ScanSession>();

// Limpieza automática de sesiones expiradas
setInterval(() => {
  const now = new Date();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

export const scanSessionStore = {
  create(restauranteId: string): { sessionId: string; expiresAt: Date } {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    sessions.set(sessionId, {
      sessionId,
      restauranteId,
      codes: [],
      createdAt: now,
      expiresAt,
    });

    return { sessionId, expiresAt };
  },

  isValid(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return false;
    }
    return true;
  },

  addCode(sessionId: string, code: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return false;
    }
    if (session.codes.length >= MAX_CODES_PER_SESSION) return false;
    session.codes.push(code);
    return true;
  },

  getCodes(sessionId: string): string[] | null {
    const session = sessions.get(sessionId);
    if (!session) return null;
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return null;
    }
    return [...session.codes];
  },

  delete(sessionId: string): void {
    sessions.delete(sessionId);
  },
};
