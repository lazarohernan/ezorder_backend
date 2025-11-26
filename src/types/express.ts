import { User } from "@supabase/supabase-js";
import { FileArray } from "express-fileupload";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      user_info?: any; // Información adicional del usuario de la tabla usuarios_info
      files?: FileArray | null | undefined;
      restaurante_filter?: string; // Filtro de restaurante para scope de permisos
    }
  }
}

export {};
