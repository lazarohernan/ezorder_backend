import type { User } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    user_info?: any;
    restaurante_filter?: string;
    files?: Record<string, any>;
  }
}
