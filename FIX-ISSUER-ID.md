# 🔧 Fix: Error 404 - Issuer not found

## Problema Identificado

```
Error 404: Issuer 478415 not found.
No GPAY_MERCHANT_EXTERNAL_ID found for this issuer
```

## Causa Raíz

El código en `src/index.js` intentaba extraer el Issuer ID del email de la cuenta de servicio usando una regex incorrecta:

```javascript
const issuerIdMatch = credentials.client_email.match(/(\d+)-/);
const issuerId = issuerIdMatch ? issuerIdMatch[1] : '3388000000023027790';
```

**Problema:**
- El `client_email` es: `cuentaserviciogooglewallet@modular-impulse-478415.p9.iam.gserviceaccount.com`
- La regex capturaba `478415` (número del proyecto de Google Cloud)
- El **Issuer ID real** de Google Wallet es: `3388000000023027790`

## Solución Implementada

### 1. Código Corregido (src/index.js)

Ahora el código usa una variable de entorno `ISSUER_ID` o el valor por defecto correcto:

```javascript
// Usar el Issuer ID de la variable de entorno o el valor por defecto
// IMPORTANTE: El Issuer ID NO es el número del proyecto de Google Cloud
// El Issuer ID es el identificador de 13 dígitos de Google Wallet
const issuerId = env.ISSUER_ID || '3388000000023027790';
```

### 2. Configuración Requerida

Para que funcione correctamente, necesitas configurar la variable `ISSUER_ID` en Cloudflare:

#### Opción A: Desde la terminal
```bash
echo "3388000000023027790" | wrangler secret put ISSUER_ID
```

#### Opción B: Desde Cloudflare Dashboard
1. Ir a: **Workers & Pages** > **smart-passes-api** > **Settings** > **Variables**
2. Hacer clic en **"Add variable"**
3. Nombre: `ISSUER_ID`
4. Tipo: **Secret** (o Text)
5. Valor: `3388000000023027790`
6. Guardar

### 3. Verificación

Para verificar que todo funcione:

1. Deploy del código actualizado:
```bash
npm run deploy
```

2. Intentar crear una nueva clase desde el dashboard del cliente

3. El `classId` generado ahora debería ser:
```
3388000000023027790.cliente-nombre_clase
```

No:
```
478415.cliente-nombre_clase  ❌ (INCORRECTO)
```

## Archivos Modificados

- ✅ `src/index.js` - Lógica corregida para obtener Issuer ID
- ✅ `wrangler.toml` - Documentación de variables de entorno
- ✅ `MIGRACION-PENDIENTE.md` - Actualizado con instrucciones de ISSUER_ID

## Notas Importantes

⚠️ **El Issuer ID NO es lo mismo que el Project Number**

- **Project Number**: `478415` (visible en Google Cloud Console)
- **Issuer ID**: `3388000000023027790` (visible en Google Wallet Console)

El Issuer ID es el identificador único de 13 dígitos que Google Wallet asigna a tu cuenta de negocio.

## Referencias

- [Google Wallet API - Issuer Setup](https://developers.google.com/wallet/generic/web/prerequisites)
- [Google Wallet Console](https://pay.google.com/business/console)
