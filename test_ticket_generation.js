const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase con clave de servicio para bypass de RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  console.error('Variables disponibles:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function probarGeneracionTicket() {
  try {
    console.log('🧪 Probando generación automática de tickets...\n');

    // Usar IDs específicos que sabemos que existen
    const restauranteId = 'e21bd7d1-f145-4df8-820f-8c483290bc59'; // Restaurante Ejemplo 1
    const metodoPagoId = 1; // efectivo
    
    console.log(`📍 Usando restaurante ID: ${restauranteId}`);
    console.log(`💳 Usando método de pago ID: ${metodoPagoId}`);

    // Verificar tickets existentes
    const { data: pedidosExistentes, error: errorExistente } = await supabase
      .from('pedidos')
      .select('numero_ticket, created_at')
      .eq('restaurante_id', restauranteId)
      .not('numero_ticket', 'is', null)
      .order('numero_ticket', { ascending: false });

    if (errorExistente) {
      console.error('❌ Error al obtener pedidos existentes:', errorExistente);
    } else {
      console.log(`📋 Pedidos existentes con ticket: ${pedidosExistentes?.length || 0}`);
      if (pedidosExistentes && pedidosExistentes.length > 0) {
        console.log('   Últimos tickets:', pedidosExistentes.slice(0, 3).map(p => `#${p.numero_ticket}`));
      }
    }

    // Crear un pedido de prueba
    console.log('\n🆕 Creando pedido de prueba...');
    const pedidoPrueba = {
      restaurante_id: restauranteId,
      metodo_pago_id: metodoPagoId,
      total: 100.50,
      subtotal: 90.00,
      impuesto: 10.50,
      mesa: 'Mesa 1',
      tipo_pedido: 'local',
      estado_pedido: 'pendiente'
    };

    const { data: nuevoPedido, error: errorCreacion } = await supabase
      .from('pedidos')
      .insert([pedidoPrueba])
      .select('id, numero_ticket, created_at, mesa')
      .single();

    if (errorCreacion) {
      console.error('❌ Error al crear pedido:', errorCreacion);
      return;
    }

    console.log(`✅ Pedido creado exitosamente:`);
    console.log(`   ID: ${nuevoPedido.id}`);
    console.log(`   Ticket: #${nuevoPedido.numero_ticket}`);
    console.log(`   Mesa: ${nuevoPedido.mesa}`);
    console.log(`   Creado: ${nuevoPedido.created_at}`);

    // Crear otro pedido para verificar secuencia
    console.log('\n🆕 Creando segundo pedido de prueba...');
    const { data: segundoPedido, error: errorSegundo } = await supabase
      .from('pedidos')
      .insert([pedidoPrueba])
      .select('id, numero_ticket, created_at')
      .single();

    if (errorSegundo) {
      console.error('❌ Error al crear segundo pedido:', errorSegundo);
    } else {
      console.log(`✅ Segundo pedido creado:`);
      console.log(`   ID: ${segundoPedido.id}`);
      console.log(`   Ticket: #${segundoPedido.numero_ticket}`);
      
      // Verificar que los tickets son consecutivos
      if (nuevoPedido.numero_ticket && segundoPedido.numero_ticket) {
        const diferencia = segundoPedido.numero_ticket - nuevoPedido.numero_ticket;
        if (diferencia === 1) {
          console.log(`✅ Los tickets son consecutivos (diferencia: ${diferencia})`);
        } else {
          console.log(`⚠️  Los tickets no son consecutivos (diferencia: ${diferencia})`);
        }
      }
    }

    console.log('\n🎉 Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

probarGeneracionTicket();
