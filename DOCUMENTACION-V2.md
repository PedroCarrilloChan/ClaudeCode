# 🎫 Smart Passes Platform V2 - Documentación Completa

## 📋 Índice
1. [Novedades de la Versión 2.0](#novedades-v2)
2. [Tipos de Pases Soportados](#tipos-de-pases)
3. [Endpoints de la API](#endpoints)
4. [Crear Clases Mejoradas](#crear-clases)
5. [Clase de Lealtad VIP](#clase-lealtad-vip)
6. [Actualizar Pases](#actualizar-pases)
7. [Notificaciones Push](#notificaciones)
8. [Ejemplos Completos](#ejemplos)

---

## 🆕 Novedades de la Versión 2.0 {#novedades-v2}

### ✅ **7 Tipos de Pases** (antes 5)
- ➕ **Transit** (Transporte Público) 🚇
- ➕ **Flight** (Pases de Abordar) ✈️

### ✅ **Notificaciones Push**
- Enviar notificaciones a un pase individual
- Enviar notificaciones masivas a todos los pases de una clase

### ✅ **Actualización de Pases**
- Actualizar campos de pases existentes (puntos, saldo, campos de texto)
- Google Wallet envía notificación automática si hay cambios importantes

### ✅ **Edición de Clases**
- Editar clases existentes (colores, logos, configuración)
- Los cambios se reflejan automáticamente en todos los pases

### ✅ **Clase de Lealtad Mejorada**
- Imagen central VIP (banner 3:1)
- Template personalizado para datos del miembro
- Contador de puntos en el strip superior
- Estructura visual profesional

---

## 🎨 Tipos de Pases Soportados {#tipos-de-pases}

| Tipo | Nombre | Descripción | Icono |
|------|--------|-------------|-------|
| `generic` | Genérico | Pase general para cualquier propósito | 🎫 |
| `loyalty` | Lealtad | Programas de puntos y recompensas | ⭐ |
| `offer` | Oferta/Cupón | Cupones de descuento y promociones | 🎁 |
| `giftcard` | Tarjeta de Regalo | Tarjetas con saldo prepagado | 💳 |
| `eventticket` | Boleto de Evento | Entradas para eventos y conciertos | 🎟️ |
| `transit` | Transporte | Pases de transporte público | 🚇 |
| `flight` | Pase de Abordar | Pases de abordaje para vuelos | ✈️ |

---

## 🔌 Endpoints de la API {#endpoints}

### **Endpoints Existentes (V1)**
```
POST /cliente/login           # Login de cliente
GET  /cliente/dashboard       # Dashboard del cliente
POST /cliente/crear-clase     # Crear nueva clase
POST /api/crear-pase          # Crear pase individual
```

### **Nuevos Endpoints (V2)**
```
POST /cliente/editar-clase    # Editar clase existente ✨
POST /api/actualizar-pase     # Actualizar pase existente ✨
POST /api/notificar-pase      # Enviar notificación a un pase ✨
POST /api/notificar-clase     # Enviar notificación masiva ✨
```

---

## 🏗️ Crear Clases Mejoradas {#crear-clases}

### **Configuración Base (Todos los Tipos)**

```json
{
  "tipo": "generic",
  "nombre_clase": "mi-pase-generico",
  "config": {
    "issuer_name": "Mi Empresa",
    "color_fondo": "#4285F4",
    "logo_url": "https://ejemplo.com/logo.png",
    "hero_url": "https://ejemplo.com/hero.jpg",
    "enlaces": [
      {
        "uri": "https://ejemplo.com",
        "description": "Sitio Web"
      }
    ],
    "webhook_url": "https://ejemplo.com/webhook"
  }
}
```

### **Configuración Específica por Tipo**

#### **🚇 Transit (Transporte)**
```json
{
  "tipo": "transit",
  "nombre_clase": "metro-cdmx",
  "config": {
    "issuer_name": "Metro CDMX",
    "transit_type": "BUS",  // BUS, RAIL, TRAM, FERRY
    "operator_name": "Sistema de Transporte Colectivo",
    "color_fondo": "#E53935"
  }
}
```

#### **✈️ Flight (Vuelo)**
```json
{
  "tipo": "flight",
  "nombre_clase": "aeromexico-vuelos",
  "config": {
    "issuer_name": "Aeromexico",
    "airline_code": "AM",
    "flight_number": "123",
    "origin_code": "MEX",
    "origin_terminal": "2",
    "origin_gate": "A12",
    "dest_code": "LAX",
    "dest_terminal": "B",
    "dest_gate": "B5",
    "color_fondo": "#0D47A1"
  }
}
```

---

## ⭐ Clase de Lealtad VIP (Mejorada) {#clase-lealtad-vip}

### **Estructura Visual**

```
┌─────────────────────────────────────────┐
│ [Logo] Programa VIP         PUNTOS: 150│ ← Strip superior
├─────────────────────────────────────────┤
│    ┌───────────────────────────────┐   │
│    │   Miembro VIP                 │   │
│    │   Descuentos por Nivel:       │   │ ← wideProgramLogo (Banner 3:1)
│    │   🥇 ORO: 25%                │   │   POSICIÓN PROMINENTE
│    │   🥈 PLATA: 18%              │   │
│    │   🥉 BRONCE: 10%             │   │
│    └───────────────────────────────┘   │
│                                         │
│ Miembro VIP:                            │
│ Mario Canul                             │ ← Datos estructurados
│ Nivel:                                  │
│ Oro - 25%                               │
│         ┌─────────────┐                 │
│         │  ███  ███   │                 │ ← QR Code
│         └─────────────┘                 │
│       0371 5892 7632 3                  │ ← Número de membresía
└─────────────────────────────────────────┘
```

### **Configuración Correcta**

**IMPORTANTE:** Usa `hero_url` (no `hero_image`). El sistema automáticamente lo convierte a `wideProgramLogo` para posición correcta.

```json
{
  "tipo": "loyalty",
  "nombre_clase": "restaurante-vip-2024",
  "config": {
    "issuer_name": "Restaurante El Buen Sabor",
    "program_name": "Programa VIP",
    "color_fondo": "#059669",
    "logo_url": "https://ejemplo.com/logo.png",

    // ✨ BANNER ANCHO VIP (3:1 ratio - 1032x336px recomendado)
    // Se posiciona JUSTO DESPUÉS del strip superior
    "hero_url": "https://ejemplo.com/miembro-vip-banner.jpg",
    "hero_description": "Miembro VIP - Descuentos por Nivel",

    // Alternativa (hace lo mismo):
    // "central_image_url": "https://ejemplo.com/miembro-vip-banner.jpg",

    // ✨ CAMPOS ESTRUCTURADOS
    "member_fields": ["nombre", "nivel", "descuento", "telefono"],

    "webhook_url": "https://ejemplo.com/webhook"
  }
}
```

**Nota sobre la imagen:**
- La imagen DEBE contener todo el texto pre-diseñado
- Dimensiones recomendadas: **1032x336 píxeles** (ratio 3:1)
- Se convierte automáticamente a `wideProgramLogo` para aparecer en posición prominente
- NO uses `heroImage` directamente (aparece al final de la tarjeta expandida)
```

### **Crear Pase de Lealtad VIP**

```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/crear-pase \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "3388000000022737801.cliente-restaurante-vip-2024",
    "datos": {
      "nombre": "Mario Canul",
      "titulo": "Miembro VIP Oro",
      "puntos": 150,
      "numero_membresia": "0371 5892 7632 3",
      "campos_texto": [
        {"id": "nombre", "header": "Miembro VIP:", "body": "Mario Canul"},
        {"id": "nivel", "header": "Nivel:", "body": "Oro - 25%"},
        {"id": "descuento", "header": "Descuento Actual:", "body": "25%"},
        {"id": "telefono", "header": "Teléfono:", "body": "(999)514 0333"}
      ],
      "barcode": {
        "type": "QR_CODE",
        "value": "https://restaurante.com/cliente/mario-canul",
        "alternateText": "0371 5892 7632 3"
      }
    }
  }'
```

---

## 🔄 Actualizar Pases {#actualizar-pases}

### **Endpoint: POST /api/actualizar-pase**

Actualiza campos de un pase existente. Google Wallet enviará notificación automática si hay cambios importantes.

```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/actualizar-pase \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "objeto_id": "3388000000022737801.cliente-clase-abc123...",
    "datos_actualizados": {
      "puntos": 250,
      "campos_texto": [
        {"id": "nivel", "header": "Nivel:", "body": "Platino - 30%"}
      ]
    }
  }'
```

### **Respuesta**

```json
{
  "success": true,
  "mensaje": "Pase actualizado. Google Wallet enviará notificación automática si hubo cambios importantes."
}
```

### **Actualizar Saldo de Gift Card**

```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/actualizar-pase \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "objeto_id": "3388000000022737801.cliente-giftcard-xyz789...",
    "datos_actualizados": {
      "saldo": 500.00,
      "moneda": "MXN"
    }
  }'
```

---

## 🔔 Notificaciones Push {#notificaciones}

### **1. Notificación Individual**

Envía notificación a UN solo pase.

**Endpoint:** `POST /api/notificar-pase`

```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/notificar-pase \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "objeto_id": "3388000000022737801.cliente-clase-abc123...",
    "mensaje": {
      "header": "¡Promoción Especial!",
      "body": "Tienes 20% de descuento extra hoy"
    }
  }'
```

**O mensaje simple:**

```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/notificar-pase \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "objeto_id": "3388000000022737801.cliente-clase-abc123...",
    "mensaje": "¡Tienes un nuevo descuento disponible!"
  }'
```

### **2. Notificación Masiva**

Envía notificación a TODOS los pases de una clase.

**Endpoint:** `POST /api/notificar-clase`

```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/notificar-clase \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "3388000000022737801.cliente-restaurante-vip-2024",
    "mensaje": {
      "header": "Evento Especial",
      "body": "Te invitamos a nuestro evento VIP el próximo viernes"
    }
  }'
```

---

## 📝 Ejemplos Completos {#ejemplos}

### **Ejemplo 1: Pase de Transporte**

#### 1. Crear Clase
```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/cliente/crear-clase \
  -H "Authorization: Bearer SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "transit",
    "nombre_clase": "metro-mensual",
    "config": {
      "issuer_name": "Metro CDMX",
      "transit_type": "RAIL",
      "operator_name": "Sistema de Transporte Colectivo",
      "color_fondo": "#E53935",
      "logo_url": "https://ejemplo.com/metro-logo.png"
    }
  }'
```

#### 2. Crear Pase
```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/crear-pase \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "3388000000022737801.cliente-metro-mensual",
    "datos": {
      "nombre": "Juan Pérez",
      "titulo": "Pase Mensual",
      "campos_texto": [
        {"id": "tipo", "header": "Tipo:", "body": "Estudiante"},
        {"id": "valido", "header": "Válido hasta:", "body": "31 Dic 2024"}
      ],
      "barcode": {
        "type": "QR_CODE",
        "value": "METRO-12345-2024",
        "alternateText": "12345"
      }
    }
  }'
```

### **Ejemplo 2: Pase de Abordar**

#### 1. Crear Clase
```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/cliente/crear-clase \
  -H "Authorization: Bearer SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "flight",
    "nombre_clase": "aeromexico-vuelos",
    "config": {
      "issuer_name": "Aeromexico",
      "airline_code": "AM",
      "flight_number": "456",
      "origin_code": "MEX",
      "origin_terminal": "2",
      "origin_gate": "A12",
      "dest_code": "LAX",
      "dest_terminal": "B",
      "dest_gate": "B5",
      "color_fondo": "#0D47A1"
    }
  }'
```

#### 2. Crear Pase
```bash
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/crear-pase \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "3388000000022737801.cliente-aeromexico-vuelos",
    "datos": {
      "nombre": "María García",
      "titulo": "Pase de Abordar",
      "campos_texto": [
        {"id": "vuelo", "header": "Vuelo:", "body": "AM 456"},
        {"id": "asiento", "header": "Asiento:", "body": "12A"},
        {"id": "hora", "header": "Hora:", "body": "15:30"}
      ],
      "barcode": {
        "type": "AZTEC",
        "value": "AM456-MEX-LAX-12A",
        "alternateText": "AM456"
      }
    }
  }'
```

### **Ejemplo 3: Actualizar Puntos y Enviar Notificación**

```bash
# 1. Actualizar puntos
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/actualizar-pase \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "objeto_id": "3388000000022737801.cliente-lealtad-abc123",
    "datos_actualizados": {
      "puntos": 500
    }
  }'

# 2. Enviar notificación
curl -X POST https://smart-passes-api.smartpasses.workers.dev/api/notificar-pase \
  -H "Authorization: Bearer API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "objeto_id": "3388000000022737801.cliente-lealtad-abc123",
    "mensaje": {
      "header": "¡Felicidades!",
      "body": "Has alcanzado 500 puntos. ¡Canjea tu recompensa!"
    }
  }'
```

---

## 🚀 Migrar de V1 a V2

### **Paso 1: Actualizar Worker**

1. Ve a GitHub → `src/worker-v2-mejorado.js`
2. Copia TODO el contenido
3. Cloudflare Dashboard → Workers → `smart-passes-api` → Quick Edit
4. Pega el código y haz **Save and Deploy**

### **Paso 2: Verificar Health**

```bash
curl https://smart-passes-api.smartpasses.workers.dev/health
```

Deberías ver `"version": "2.0.0"`

### **Paso 3: Compatibilidad**

✅ Todos los endpoints V1 siguen funcionando
✅ Los pases existentes no se ven afectados
✅ Puedes usar las nuevas funcionalidades inmediatamente

---

## 📊 Resumen de Mejoras

| Funcionalidad | V1 | V2 |
|---------------|----|----|
| Tipos de pases | 5 | 7 ✨ |
| Notificaciones | ❌ | ✅ Individual + Masiva ✨ |
| Actualizar pases | ❌ | ✅ PATCH ✨ |
| Editar clases | ❌ | ✅ ✨ |
| Template de lealtad | Básico | VIP Mejorado ✨ |
| Imagen central VIP | ❌ | ✅ 3:1 ✨ |

---

## 🆘 Soporte

¿Necesitas ayuda? Revisa:
- `src/worker-v2-mejorado.js` - Código fuente completo
- `/health` - Estado del sistema
- GitHub Issues - Reportar problemas

---

**Smart Passes Platform V2** 🎫
*Powered by Cloudflare Workers + Google Wallet API*
