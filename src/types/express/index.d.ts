import { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      user_info?: any;
    }
  }
}

// Exportamos nada porque este es solo un archivo de declaración
export {};
