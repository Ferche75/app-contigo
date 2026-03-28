# Contigo - Diabetes Care

> "Como un hijo cuidando a su padre con diabetes"

Aplicación PWA para ayudar a personas con diabetes a manejar su día a día de forma simple, usable y segura.

## Características

- **Recordatorios de medicación** con alertas y seguimiento de adherencia
- **Cuidado de pies** con checklist diario y detección de heridas
- **Registro de glucosa** y notas diarias
- **Gestión de turnos médicos** con recordatorios
- **Botón de emergencia** con llamada y WhatsApp
- **Modo de baja visión** para accesibilidad
- **Funciona offline** con sincronización automática

## Stack Tecnológico

- **Frontend**: React + Vite + TypeScript
- **Estilos**: CSS Modules
- **Base de datos local**: IndexedDB (Dexie)
- **Backend/Sync**: Supabase (Auth + PostgreSQL)
- **PWA**: Vite Plugin PWA + Workbox
- **Iconos**: Lucide React

## Requisitos

- Node.js 18+
- Cuenta en Supabase

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repo-url>
   cd app
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Edita `.env` con tus credenciales de Supabase:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Configurar Supabase**
   - Crea un proyecto en [Supabase](https://supabase.com)
   - Ve al SQL Editor y ejecuta el contenido de `supabase/schema.sql`
   - Configura la autenticación por email en Authentication > Settings

5. **Iniciar desarrollo**
   ```bash
   npm run dev
   ```

6. **Construir para producción**
   ```bash
   npm run build
   ```

## Estructura del Proyecto

```
src/
├── app/
│   ├── App.tsx           # Componente principal
│   ├── routes.tsx        # Configuración de rutas
│   └── shell/            # Shell de la app (TopBar, TabBar, etc.)
├── components/
│   └── ui/               # Componentes UI reutilizables
├── context/
│   ├── AuthContext.tsx   # Autenticación
│   └── SettingsContext.tsx # Configuración
├── data/
│   ├── supabase/         # Cliente y tipos de Supabase
│   ├── local/            # IndexedDB (Dexie)
│   ├── repos/            # Repositorios por entidad
│   └── sync/             # Motor de sincronización
├── features/             # Features/Páginas
│   ├── onboarding/       # Login/Register
│   ├── today/            # Home/Dashboard
│   ├── meds/             # Medicación
│   ├── footcare/         # Cuidado de pies
│   ├── appointments/     # Turnos médicos
│   ├── profile/          # Perfil y emergencia
│   └── admin/            # Panel de admin
├── hooks/                # Custom hooks
├── types/                # Tipos TypeScript
└── index.css             # Variables CSS globales
```

## Arquitectura Offline-First

La app utiliza una arquitectura offline-first:

1. **Lectura**: Lee primero de IndexedDB (local)
2. **Escritura**: Guarda en IndexedDB y encola para sync
3. **Sync**: Sincroniza con Supabase cuando hay conexión
4. **Background sync**: Procesa la cola de operaciones pendientes

## PWA

La app es instalable como PWA:

- **Android**: Aparecerá el banner de instalación
- **iOS**: Usa "Agregar a Inicio" desde el menú de compartir
- **Desktop**: Aparecerá el icono de instalación en la barra de direcciones

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Construye para producción |
| `npm run preview` | Previsualiza build de producción |
| `npm run lint` | Ejecuta ESLint |

## Accesibilidad

- Modo de baja visión (texto grande, alto contraste)
- Soporte para screen readers
- Botones grandes y targets táctiles amplios
- Navegación por teclado
- Reduced motion support

## Disclaimer

> **Esta aplicación no reemplaza el consejo médico profesional.** 
> Ante síntomas graves o urgencias, llama al servicio de emergencias de tu localidad.

## Licencia

MIT - Developed by cheves.co
