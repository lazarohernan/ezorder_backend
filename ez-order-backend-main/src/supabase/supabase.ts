import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate that credentials are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials. Please check your .env file.");
  process.exit(1);
}

// Create Supabase client for regular operations (with anon key)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create Supabase client for admin operations (with service role key)
// SOLO usar para operaciones que realmente requieren bypass RLS (como obtener usuarios_info en middleware)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Crea un cliente de Supabase con el token del usuario configurado
 * Esto permite que las políticas RLS funcionen correctamente
 * Usa la opción accessToken como recomienda la documentación de Supabase
 * 
 * @param accessToken - Token JWT del usuario autenticado
 * @returns Cliente de Supabase con RLS habilitado
 */
export const getSupabaseClientWithAuth = (accessToken: string): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => accessToken,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
};

export { supabase };
