import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, nombre, apellido, telefono, restaurante_id } = await req.json()

    // Validar que se proporciona el email
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, message: 'El email es obligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente de Supabase con service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar si el usuario ya existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUsers?.users.some(u => u.email === email)

    if (userExists) {
      return new Response(
        JSON.stringify({ success: false, message: 'Ya existe un usuario con este correo electrónico' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear usuario con invitación por email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false, // Esto enviará un email de confirmación
      user_metadata: {
        nombre,
        apellido,
        telefono,
      },
    })

    if (authError || !authData) {
      console.error('Error al invitar usuario:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error al invitar usuario',
          error: authError?.message || 'Error desconocido'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // Crear el registro de información del usuario
    const { data, error } = await supabaseAdmin
      .from('usuarios_info')
      .insert([
        {
          id: userId,
          nombre_usuario: `${nombre} ${apellido}`.trim(),
          restaurante_id,
          updated_at: new Date(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error al crear usuarios_info:', error)
      // Intentar eliminar el usuario de auth si falla la creación de info
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw error
    }

    // Devolver el usuario completo
    const userWithInfo = {
      id: authData.user.id,
      email: authData.user.email,
      created_at: authData.user.created_at,
      user_info: data,
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuario invitado exitosamente. Se ha enviado un correo electrónico con las instrucciones para establecer su contraseña.',
        data: userWithInfo,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error al invitar usuario:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al invitar usuario',
        error: error.message || 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
