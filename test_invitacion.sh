#!/bin/bash

# Script para probar la función de invitación de usuarios
# URL del backend (ajustar si es necesario)
BACKEND_URL="http://localhost:3001"

echo "🧪 Probando función de invitación de usuarios EZ Order"
echo "=================================================="

# 1. Verificar si el backend está corriendo
echo "1. Verificando conexión con backend..."
if ! curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo "❌ Backend no está corriendo en $BACKEND_URL"
    echo "💡 Por favor inicia el backend con: npm run dev"
    exit 1
fi

echo "✅ Backend está corriendo"

# 2. Iniciar sesión para obtener token
echo "2. Iniciando sesión para obtener token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hlazaroe@gmail.com",
    "password": "tu_contraseña_aqui"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "success.*false"; then
    echo "❌ Error en login. Verifica credenciales en el script."
    echo "Respuesta: $LOGIN_RESPONSE"
    exit 1
fi

# Extraer token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ No se pudo obtener token. Respuesta:"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:20}..."

# 3. Probar la función de invitación
echo "3. Enviando invitación a lazaro-hernan@hotmail.com..."

INVITE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/usuarios/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "lazaro-hernan@hotmail.com",
    "nombre": "Lázaro",
    "apellido": "Hernández",
    "telefono": "+1234567890",
    "restaurante_id": "123e4567-e89b-12d3-a456-426614174000"
  }')

echo "📧 Respuesta de invitación:"
echo "$INVITE_RESPONSE" | jq '.' 2>/dev/null || echo "$INVITE_RESPONSE"

# 4. Verificar resultado
if echo "$INVITE_RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ ¡Invitación enviada exitosamente!"
    echo "📨 Revisa el correo lazaro-hernan@hotmail.com"
    echo ""
    echo "🎨 La plantilla debería verse con:"
    echo "   - Gradiente naranja (#ff6b35 → #f7931e)"
    echo "   - Diseño minimalista sin información extra"
    echo "   - Botón '🚀 Activar mi cuenta'"
else
    echo ""
    echo "❌ Error al enviar invitación"
    echo "Verifica los logs del backend para más detalles"
fi

echo ""
echo "=================================================="
echo "🏁 Prueba completada"
