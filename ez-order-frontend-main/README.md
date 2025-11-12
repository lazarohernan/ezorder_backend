# EZ Order Frontend

Frontend de la aplicación EZ Order construido con Vue 3, TypeScript, Vite y Tailwind CSS.

## 🚀 Despliegue en Vercel

Este proyecto está configurado para desplegarse automáticamente en Vercel.

### Configuración Requerida

1. **Variables de Entorno**: Configura las siguientes variables en Vercel:
   - `VITE_API_URL`: URL de la API backend (ej: `https://tu-backend.vercel.app`)
   - `VITE_SUPABASE_URL`: URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY`: Clave anónima de Supabase

2. **Framework**: Vite (detectado automáticamente por Vercel)

3. **Build Command**: `npm run build` (configurado en `vercel.json`)

4. **Output Directory**: `dist` (configurado en `vercel.json`)

### Instalación Local

```bash
npm install
npm run dev
```

### Build para Producción

```bash
npm run build
npm run preview
```

## 📁 Estructura del Proyecto

```
src/
├── components/      # Componentes reutilizables
├── composables/     # Composables de Vue
├── modules/         # Módulos de la aplicación
│   ├── admin/       # Módulo administrativo
│   └── auth/        # Módulo de autenticación
├── router/          # Configuración de rutas
├── services/        # Servicios API
├── stores/          # Stores de Pinia
└── utils/           # Utilidades
```

## 🔧 Tecnologías

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- Pinia
- Vue Router
- Axios
- Vue Toastification

