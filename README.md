# EZ Order Backend API

Backend API de la aplicación EZ Order construido con Fastify, TypeScript y Supabase.

## 🚀 Despliegue

El proyecto se despliega en **AWS Lambda** mediante GitHub Actions al hacer push a `main`.

### Variables de Entorno

- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase
- `SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `NODE_ENV`: `production`

### Instalación Local

```bash
npm install
npm run dev
```

### Build para Producción

```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
src/
├── controllers/     # Controladores de rutas
├── middlewares/     # Middlewares (auth, permissions)
├── routes/          # Definición de rutas
├── services/        # Servicios de negocio
├── supabase/        # Configuración de Supabase
└── utils/           # Utilidades
```

## 🔧 Tecnologías

- Fastify 5
- TypeScript
- Supabase
- AWS Lambda
