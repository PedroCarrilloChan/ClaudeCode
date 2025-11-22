# 🚀 Cómo Desplegar a Producción en Cloudflare

## Opción 1: Deployment Manual desde Dashboard (Recomendado)

1. Ve al dashboard de Cloudflare Workers: https://dash.cloudflare.com
2. Navega a: **Workers y Pages** > **claudecode**
3. Ve a la pestaña **"Implementaciones"**
4. Busca el deployment más reciente (commit `ddcbf24`)
5. Click en los **3 puntos (⋮)** a la derecha
6. Selecciona **"Promover a producción"** o **"Promote to production"**
7. Confirma la acción

✅ Esto desplegará inmediatamente tu código más reciente a producción.

---

## Opción 2: Deployment Automático vía Git

Si tienes configurado un branch de producción automática:

### Paso 1: Verificar branch de producción
```bash
# Ver configuración en Cloudflare Dashboard:
# Settings > Builds & deployments > Production branch
```

### Paso 2: Hacer merge al branch de producción
```bash
# Si el branch de producción es 'production':
git checkout production
git merge claude/code-analysis-review-015cGRNEGzDB8KV28Mj3a2Vt
git push -u origin production

# O si el branch es 'main':
git checkout main
git merge claude/code-analysis-review-015cGRNEGzDB8KV28Mj3a2Vt
git push -u origin main
```

---

## Opción 3: Deployment con Wrangler CLI

Si tienes un API token de Cloudflare configurado localmente:

```bash
# Configurar token (solo una vez)
export CLOUDFLARE_API_TOKEN="tu-token-aqui"

# O agregarlo a ~/.bashrc o ~/.zshrc
echo 'export CLOUDFLARE_API_TOKEN="tu-token"' >> ~/.bashrc

# Desplegar
wrangler deploy
```

### Crear API Token:
1. https://dash.cloudflare.com/profile/api-tokens
2. Click en "Create Token"
3. Usar template "Edit Cloudflare Workers"
4. Copiar el token generado

---

## ✅ Verificar Deployment

Después de desplegar, verifica:

1. **URL de producción**: https://claudecode-4jw.pages.dev
2. **Healthcheck**:
   ```bash
   curl https://claudecode-4jw.pages.dev/health
   ```
3. **Versión desplegada**: Verificar en el dashboard que el commit sea `ddcbf24`

---

## 🧪 Probar las Nuevas Credenciales

Una vez desplegado, prueba crear una clase:

```bash
curl -X POST https://claudecode-4jw.pages.dev/cliente/crear-clase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "tipo": "loyalty",
    "nombre_clase": "prueba-nueva-cuenta",
    "config": {
      "issuer_name": "Umbrella Marketing",
      "color_fondo": "#4285F4",
      "logo_url": "https://ejemplo.com/logo.png"
    }
  }'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "class_id": "3388000000023027790.prueba-nueva-cuenta",
  "message": "Clase creada exitosamente"
}
```

Si ves errores de autenticación de Google Wallet, verifica que:
- ✅ GOOGLE_CREDENTIALS esté configurado correctamente en Cloudflare
- ✅ El JSON tenga el formato correcto
- ✅ El service account tenga los permisos necesarios

---

## 📊 Monitorear el Deployment

Puedes ver logs en tiempo real:

1. Dashboard > **claudecode** > **Logs** (en el menú superior)
2. O usa Wrangler:
   ```bash
   wrangler tail
   ```
