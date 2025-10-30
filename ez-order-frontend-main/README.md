# 🍽️ EZOrder - Frontend

Sistema de gestión de pedidos y facturación para restaurantes desarrollado con Vue.js 3.

## 📋 Descripción

EZOrder es una aplicación web moderna diseñada para facilitar la gestión completa de restaurantes, desde la toma de pedidos hasta la facturación y administración de clientes.

## ✨ Características Principales

### 🛒 **Gestión de Pedidos**

- Toma de pedidos intuitiva y rápida
- Seguimiento de estados de pedidos en tiempo real
- Calculadora integrada para totales
- Sistema de descuentos

### 🧾 **Facturación**

- Cumplimiento con sistema fiscal de Honduras (ISV 15%)
- Clasificación automática de productos (Exento, Exonerado, Gravado)
- Generación de facturas en PDF
- Múltiples métodos de pago

### 👥 **Gestión de Clientes**

- Registro y administración de clientes
- Historial de pedidos por cliente
- Información de contacto y entrega

### 🍕 **Administración de Menú**

- Gestión completa del menú del restaurante
- Categorización de productos
- Control de precios y disponibilidad
- Clasificación fiscal de productos

### 📊 **Panel Administrativo**

- Dashboard con estadísticas en tiempo real
- Reportes de ventas y pedidos
- Gestión de usuarios y roles
- Configuración de restaurantes

## 🛠️ Tecnologías Utilizadas

- **Vue.js 3** - Framework principal
- **TypeScript** - Tipado estático
- **Vue Router** - Navegación
- **Pinia** - Gestión de estado
- **Axios** - Cliente HTTP
- **Vite** - Build tool y desarrollo

## 🚀 Instalación y Desarrollo

### Prerrequisitos

- Node.js (v16 o superior)
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone [url-del-repositorio]

# Navegar al directorio
cd ez_order

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

### Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
├── modules/            # Módulos de la aplicación
│   ├── admin/          # Panel administrativo
│   └── auth/           # Autenticación
├── services/           # Servicios API
├── stores/             # Gestión de estado (Pinia)
├── interfaces/         # Tipos TypeScript
└── router/             # Configuración de rutas
```

## 🔧 Configuración

### Variables de Entorno

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=EZOrder
```

## 📱 Funcionalidades por Módulo

### **Módulo de Autenticación**

- Login y registro de usuarios
- Recuperación de contraseña
- Gestión de sesiones

### **Módulo Administrativo**

- Dashboard principal
- Gestión de pedidos
- Administración de menú
- Reportes y estadísticas
- Configuración de usuarios

## 🎯 Estado del Proyecto

✅ **Completado:**

- Sistema de autenticación
- Gestión de pedidos
- Panel administrativo
- Facturación con ISV
- Gestión de clientes

🚧 **En desarrollo:**

- Notificaciones en tiempo real
- Reportes avanzados
- Integración con WhatsApp

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 📞 Contacto

Para soporte o consultas sobre el proyecto, contacta al equipo de desarrollo.

---

**EZOrder** - Simplificando la gestión de restaurantes 🚀
