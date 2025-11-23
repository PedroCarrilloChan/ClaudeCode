# 🔧 Solución al Error "Issuer 478415 not found"

## 📋 Resumen del Problema

El error que estás viendo:
```
Error 404: Issuer 478415 not found.
No GPAY_MERCHANT_EXTERNAL_ID found for this issuer
```

**Causa**: El código en producción (Cloudflare) está usando el número del proyecto de Google Cloud (`478415`) en lugar del Issuer ID correcto de Google Wallet (`3388000000023027790`).

**Estado**: ✅ El código local YA está corregido, pero ❌ NO se ha deployado a producción.

---

## 🚀 Solución (3 pasos)

### Paso 1: Deployar el Código Corregido

El código ya tiene la corrección en ambos archivos:
- ✅ `src/index.js` (línea 269)
- ✅ `src/index-consolidado.js` (línea 1224)

**Deployar a Cloudflare**:

```bash
# Asegúrate de estar en el directorio del proyecto
cd /home/user/ClaudeCode

# Deployar (requiere autenticación con Cloudflare)
npm run deploy
```

Si te pide autenticación:

```bash
# Opción A: Login con tu cuenta de Cloudflare
npx wrangler login

# Opción B: Usar un API Token
export CLOUDFLARE_API_TOKEN="tu-token-aqui"
npm run deploy
```

**Obtener un API Token**:
1. Ir a: https://dash.cloudflare.com/profile/api-tokens
2. Click en "Create Token"
3. Usar la plantilla "Edit Cloudflare Workers"
4. Copiar el token generado

---

### Paso 2: Configurar Variable de Entorno ISSUER_ID (Opcional pero Recomendado)

Aunque el código tiene un valor por defecto correcto (`3388000000023027790`), es mejor configurarlo como variable de entorno.

**Opción A: Desde la terminal**

```bash
# Configurar ISSUER_ID
echo "3388000000023027790" | npx wrangler secret put ISSUER_ID
```

**Opción B: Desde el Dashboard de Cloudflare**

1. Ir a: https://dash.cloudflare.com
2. Navegar a: **Workers & Pages** > **smart-passes-api** > **Settings** > **Variables**
3. Click en "Add variable"
4. Configurar:
   - **Name**: `ISSUER_ID`
   - **Type**: Secret (o Text)
   - **Value**: `3388000000023027790`
5. Click "Save"

---

### Paso 3: Verificar que Todo Funcione

Una vez deployado, intenta crear una clase nuevamente desde el dashboard de cliente.

**Verificación**:

1. Ir a tu dashboard de cliente
2. Intentar crear una nueva clase
3. El `class_id` generado debe ser:
   ```
   3388000000023027790.cliente-nombre_clase
   ```

   NO:
   ```
   478415.cliente-nombre_clase  ❌
   ```

**Si sigue fallando**, verifica en los logs de Cloudflare:

```bash
# Ver logs en tiempo real
npx wrangler tail
```

---

## 🔍 Validación

### Antes (Código Viejo - INCORRECTO)

El código viejo extraía el issuer ID del email:

```javascript
const issuerIdMatch = credentials.client_email.match(/(\d+)-/);
const issuerId = issuerIdMatch ? issuerIdMatch[1] : '3388000000023027790';
```

Esto extraía `478415` del email:
```
cuentaserviciogooglewallet@modular-impulse-478415.p9.iam.gserviceaccount.com
                                            ^^^^^^ (número del proyecto, NO el issuer)
```

### Después (Código Nuevo - CORRECTO)

```javascript
// Usar el Issuer ID de la variable de entorno o el valor por defecto
// IMPORTANTE: El Issuer ID NO es el número del proyecto de Google Cloud
// El Issuer ID es el identificador de 13 dígitos de Google Wallet
const issuerId = env.ISSUER_ID || '3388000000023027790';
```

---

## ⚠️ Notas Importantes

1. **Issuer ID vs Project Number**:
   - ❌ **Project Number**: `478415` (Google Cloud Console)
   - ✅ **Issuer ID**: `3388000000023027790` (Google Wallet Console)

2. **Dónde encontrar tu Issuer ID**:
   - Ir a: https://pay.google.com/business/console
   - Navegar a: "API de Google Wallet"
   - El Issuer ID es el número de 13 dígitos que aparece en tu cuenta

3. **Archivo principal deployado**:
   - Según `wrangler.toml`, el archivo principal es: `src/index-consolidado.js`
   - Asegúrate de que este archivo tenga la corrección

---

## 🧪 Testing

Después de deployar, puedes probar con curl:

```bash
curl -X POST https://tu-worker.workers.dev/cliente/crear-clase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_SESSION_ID" \
  -d '{
    "tipo": "loyalty",
    "nombre_clase": "test-clase",
    "config": {
      "issuer_name": "Mi Negocio",
      "color_fondo": "#4285F4"
    }
  }'
```

Respuesta esperada:

```json
{
  "success": true,
  "class_id": "3388000000023027790.cliente-test-clase",
  "mensaje": "Clase creada exitosamente"
}
```

---

## 📞 Si Sigue Sin Funcionar

Si después de deployar el código sigue dando error, verifica:

1. **¿El deployment fue exitoso?**
   ```bash
   npx wrangler deployments list
   ```

2. **¿Las credenciales de Google están configuradas?**
   ```bash
   npx wrangler secret list
   ```

   Debe aparecer `GOOGLE_CREDENTIALS`

3. **¿El Issuer ID es correcto en Google Wallet?**
   - Verificar en: https://pay.google.com/business/console

4. **¿La cuenta de servicio tiene permisos?**
   - Verificar en Google Cloud Console que tenga rol "Wallet Objects Admin"

---

## ✅ Checklist

- [ ] Deployar código corregido a Cloudflare (`npm run deploy`)
- [ ] Configurar variable `ISSUER_ID` en Cloudflare (opcional)
- [ ] Verificar deployment exitoso
- [ ] Probar creación de clase desde dashboard
- [ ] Verificar que el class_id use el issuer correcto (3388000000023027790)

---

**Última actualización**: 2025-11-22
