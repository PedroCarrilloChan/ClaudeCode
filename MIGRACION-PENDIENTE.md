# 🔄 Migración a Nueva Cuenta Google Wallet - Tareas Pendientes

## 📊 Estado Actual

### ✅ Completado
- [x] Código migrado al nuevo Issuer ID: `3388000000023027790`
- [x] Cuenta de Google Wallet creada: `modular-impulse-478415`
- [x] Clase de prueba creada en Google Wallet
- [x] Perfil de negocio completado (Umbrella Marketing)
- [x] Usuarios configurados:
  - Admin: `umbrellamkting@gmail.com`
  - Service Account: `cuentaserviciogooglewallet@modular-impulse-478415.p9.iam.gserviceaccount.com`

### ❌ Pendiente

#### 1. **Solicitar Acceso a Producción** (Crítico)
**Estado**: Actualmente en "modo demo" (2/3 completado)

**Qué hacer**:
1. Ir a: [Google Wallet Console](https://pay.google.com/business/console)
2. Navegar a: "API de Google Wallet" > Pestaña "Administrar"
3. Hacer clic en: **"Solicitar acceso de publicación"** o **"Request publishing access"**
4. Completar el formulario de solicitud:
   - Descripción del negocio: Umbrella Marketing
   - Tipo de pases: Loyalty, Generic, Offers, etc.
   - URL del sitio web
   - Descripción del caso de uso

**Tiempo de aprobación**: 2-5 días hábiles

**Nota**: Sin esto, los pases solo funcionarán en modo de prueba para usuarios de prueba autorizados.

---

#### 2. **Actualizar Credenciales GOOGLE_CREDENTIALS**

**Service Account Detectado** (según las imágenes):
```
cuentaserviciogooglewallet@modular-impulse-478415.p9.iam.gserviceaccount.com
```

**Pasos para obtener las credenciales JSON**:

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Seleccionar proyecto: `modular-impulse-478415`
3. Menú > "IAM y administración" > "Cuentas de servicio"
4. Buscar: `cuentaserviciogooglewallet@modular-impulse-478415.p9.iam.gserviceaccount.com`
5. Click en los 3 puntos > "Administrar claves"
6. "Agregar clave" > "Crear nueva clave" > "JSON"
7. Descargar el archivo JSON

**Formato esperado del JSON**:
```json
{
  "type": "service_account",
  "project_id": "modular-impulse-478415",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "cuentaserviciogooglewallet@modular-impulse-478415.p9.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**Configurar en Cloudflare Workers**:

```bash
# Desde la terminal (requiere autenticación)
wrangler secret put GOOGLE_CREDENTIALS

# O desde el Dashboard de Cloudflare:
# 1. Ir a: Workers & Pages > smart-passes-api > Settings > Variables
# 2. Agregar variable tipo "Secret" llamada: GOOGLE_CREDENTIALS
# 3. Pegar el contenido del JSON completo
```

---

#### 3. **Verificar Permisos del Service Account**

El service account debe tener estos roles en el proyecto:

- ✅ **Google Wallet API Admin** (obligatorio)
- ✅ **Service Account Token Creator** (recomendado)

**Verificar/Configurar permisos**:
1. Google Cloud Console > IAM y administración > IAM
2. Buscar: `cuentaserviciogooglewallet@...`
3. Click en "Editar principal"
4. Agregar roles si faltan:
   - `Wallet Objects Editor`
   - `Wallet Objects Admin`

---

#### 4. **Habilitar Google Wallet API**

**Verificar que esté habilitada**:
1. Google Cloud Console > APIs y servicios > Biblioteca
2. Buscar: "Google Wallet API"
3. Si no está habilitada, hacer click en "Habilitar"

---

## 🧪 Pruebas Post-Migración

Una vez completados los pasos anteriores:

### 1. Probar creación de clase
```bash
curl -X POST https://tu-worker.workers.dev/cliente/crear-clase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "tipo": "loyalty",
    "nombre_clase": "test-migracion",
    "config": {
      "issuer_name": "Umbrella Marketing",
      "color_fondo": "#4285F4"
    }
  }'
```

### 2. Probar creación de pase
```bash
curl -X POST https://tu-worker.workers.dev/api/crear-pase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "class_id": "3388000000023027790.test-migracion",
    "object_id": "3388000000023027790.test-migracion-001",
    "datos": {
      "holder_name": "Juan Pérez"
    }
  }'
```

### 3. Verificar en Google Wallet
- Abrir el enlace de pase generado
- Agregar a Google Wallet
- Verificar que se vea correctamente

---

## 📋 Checklist de Migración

- [x] Código actualizado al nuevo Issuer ID
- [x] Cuenta de Google Wallet creada
- [ ] **Acceso a producción solicitado y aprobado**
- [ ] **Credenciales GOOGLE_CREDENTIALS actualizadas en Cloudflare**
- [ ] Permisos del service account verificados
- [ ] Google Wallet API habilitada
- [ ] Prueba de creación de clase exitosa
- [ ] Prueba de creación de pase exitosa
- [ ] Pase verificado en Google Wallet app

---

## 🚨 Nota Importante

**Mientras estés en modo demo**:
- Solo podrás crear y probar pases
- Los pases solo funcionarán para usuarios de prueba que agregues manualmente
- No podrás distribuir pases públicamente
- Verás advertencias en la consola de Google Wallet

**Una vez aprobado para producción**:
- Podrás crear clases y pases sin restricciones
- Los pases funcionarán para cualquier usuario
- Podrás distribuir públicamente

---

## 📞 Soporte

Si tienes problemas durante la migración:
- [Documentación Google Wallet API](https://developers.google.com/wallet)
- [Consola Google Wallet](https://pay.google.com/business/console)
- [Google Cloud Console](https://console.cloud.google.com)
