# Cambios realizados en Contigo

## Correcciones de UX/UI

### 1. Tab activo ahora se ve claramente
- Fondo verde suave (`--color-primary-50`) en el tab seleccionado
- Ícono con más peso visual (strokeWidth 2.5 vs 1.8)
- Área táctil aumentada a 68×60px (antes 64×56px)
- Etiqueta en negrita cuando está activo

### 2. Botón "Reportar herida" ahora luce urgente
- Cambio de `variant="outline"` a borde rojo con color de danger
- El ícono AlertTriangle hereda el color rojo
- Inmediatamente reconocible como acción de alerta

### 3. Checkboxes más grandes para adultos mayores
- Tamaño global aumentado a 28×28px
- En checklists de pies: 32×32px
- En modo low-vision: 40×40px
- Área mínima de toque en todos los botones: 44px (estándar WCAG)

### 4. Historial de revisiones de pies mejorado
- Chips más anchos (72px mínimo, antes 60px)
- Ícono de estado más grande (20px, antes 16px)
- Color de borde verde para revisiones OK, amarillo para alertas

### 5. Service Worker corregido
- Creado `/public/sw.js` con soporte de cache offline
- Eliminado el error de MIME `text/html` en consola
- El SW ahora soporta Push Notifications para recordatorios

---

## Features nuevas

### 6. Página de Signos Vitales (`/vitals`)
Nueva sección accesible desde el tab "Signos" en la barra inferior.

**Glucemia:**
- Registro con tipo: Ayunas / Post-comida / Aleatoria / Antes de dormir
- Gráfico de barras de las últimas 14 lecturas con código de color
- Clasificación automática: Normal / Bajo / Elevado / Alto
- Valores de referencia visibles

**Presión arterial:**
- Registro de sistólica, diastólica y pulso opcional
- Gráfico horizontal por lectura
- Clasificación: Normal / Elevada / Alta / Crisis
- Tip para tomar medición correctamente

**Peso corporal:**
- Registro en kg
- Comparación vs medición anterior (↑ / ↓)
- Historial de 30 lecturas

### 7. Resumen de vitales en pantalla "Hoy"
- Strip clickeable que muestra glucosa y presión del día
- Se pone rojo si algún valor está fuera de rango
- Lleva directo a la pantalla de Vitales

### 8. Recordatorios push de medicación
- Al abrir la app se pide permiso de notificaciones (una sola vez)
- Cada medicamento pendiente programa una notificación a su hora
- Funciona en segundo plano gracias al Service Worker
- Al tocar la notificación se abre la app

### 9. Nueva base de datos (versión 2)
Tres tablas nuevas en IndexedDB (local) y Supabase:
- `blood_pressure` — lecturas de presión arterial
- `glucose_readings` — lecturas de glucemia (separado del diario)
- `weight_readings` — registros de peso

---

## Para agregar el schema en Supabase
Ejecutar en el SQL Editor de Supabase el contenido al final de `supabase/schema.sql`
(las 3 tablas nuevas están al final del archivo).
