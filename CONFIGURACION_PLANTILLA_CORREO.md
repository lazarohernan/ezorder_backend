# 🎨 Plantilla de Correo de Invitación - EZ Order

## 📁 Archivos Creados

1. **`plantilla_correo_invitacion.html`** - Plantilla HTML lista para usar
2. **`plantilla_correo_estilos.css`** - Estilos CSS para referencia y personalización

---

## 🔧 Cómo Configurar en Supabase

### **Opción 1: Usar el Dashboard de Supabase**

1. **Ve al Dashboard de Supabase**
2. **Authentication** → **Email Templates**
3. **Selecciona "Invite"**
4. **Pega el código HTML** en el editor
5. **Guarda los cambios**

### **Opción 2: Vía SQL (Método recomendado)**

Ejecuta este SQL en tu proyecto Supabase:

```sql
-- Actualizar plantilla de invitación
UPDATE auth.mfa_factors 
SET template_content = 'PEGAR_AQUÍ_EL_HTML'
WHERE name = 'invite';
```

---

## 🎯 Variables Disponibles

La plantilla usa estas variables de Supabase:

- `{{ .ConfirmationURL }}` - Enlace de confirmación
- `{{ .Email }}` - Email del usuario
- `{{ .UserMetadata.nombre }}` - Nombre del usuario
- `{{ .UserMetadata.apellido }}` - Apellido del usuario
- `{{ .UserMetadata.telefono }}` - Teléfono
- `{{ .UserMetadata.restaurante_id }}` - ID del restaurante
- `{{ .UserMetadata.nombre_restaurante }}` - Nombre del restaurante
- `{{ .UserMetadata.rol_nombre }}` - Nombre del rol

---

## 🎨 Características de la Plantilla

### **✅ Diseño Minimalista**
- Gradiente elegante en header
- Tarjeta blanca centrada
- Sombras suaves y bordes redondeados

### **✅ Contenido Personalizado**
- Saludo con nombre del usuario
- Información del restaurante y rol
- Botón principal con emoji

### **✅ Elementos de UX**
- Botón grande y accesible
- Enlace alternativo por seguridad
- Nota de expiración (24 horas)
- Diseño responsive para móviles

### **✅ Branding**
- Logo con emoji 🍽️
- Gradiente purple-blue (#667eea → #764ba2)
- Footer con marca y año

---

## 🚀 Personalización Adicional

### **Cambiar Colores**
```css
/* Header */
.email-header {
    background: linear-gradient(135deg, #TU_COLOR_1 0%, #TU_COLOR_2 100%);
}

/* Botón */
.btn-primary {
    background: linear-gradient(135deg, #TU_COLOR_1 0%, #TU_COLOR_2 100%);
}
```

### **Cambiar Logo**
Reemplaza `🍽️ EZ Order` con tu logo o nombre preferido.

### **Añadir Metadata Adicional**
En la función `inviteUsuario`, agrega más metadata:

```typescript
user_metadata: {
  nombre,
  apellido,
  telefono,
  nombre_restaurante: 'Mi Restaurante',
  rol_nombre: 'Administrador',
  logo_url: 'https://mi-sitio.com/logo.png'
},
```

---

## 📱 Vista Previa

La plantilla se verá así en diferentes dispositivos:

- **Desktop**: Tarjeta centrada con 500px máximo
- **Móvil**: Ancho completo con padding reducido
- **Tablet**: Layout adaptativo entre mobile y desktop

---

## 🔥 Siguiente Paso

1. **Copia el código HTML** del archivo `plantilla_correo_invitacion.html`
2. **Pégalo en Supabase Dashboard** → Authentication → Email Templates → Invite
3. **Prueba la invitación** con un nuevo usuario
4. **Verifica el diseño** en diferentes clientes de email

¿Necesitas algún ajuste específico en el diseño o contenido?
