/**
 * Smart Passes Platform - Cloudflare Worker
 * Sistema completo de Google Wallet
 * VERSIÓN CONSOLIDADA PARA QUICK EDIT
 */

// ==========================================
// GOOGLE WALLET INTEGRATION
// ==========================================

// Tipos de pases soportados
const TIPOS_PASE = {
  'generic': {
    nombre: 'Genérico',
    endpoint_clase: 'genericClass',
    endpoint_objeto: 'genericObject',
    icono: '🎫'
  },
  'loyalty': {
    nombre: 'Lealtad',
    endpoint_clase: 'loyaltyClass',
    endpoint_objeto: 'loyaltyObject',
    icono: '⭐'
  },
  'offer': {
    nombre: 'Oferta/Cupón',
    endpoint_clase: 'offerClass',
    endpoint_objeto: 'offerObject',
    icono: '🎁'
  },
  'giftcard': {
    nombre: 'Tarjeta de Regalo',
    endpoint_clase: 'giftCardClass',
    endpoint_objeto: 'giftCardObject',
    icono: '💳'
  },
  'eventticket': {
    nombre: 'Boleto de Evento',
    endpoint_clase: 'eventTicketClass',
    endpoint_objeto: 'eventTicketObject',
    icono: '🎟️'
  }
};

/**
 * Base64 URL encode
 */
function base64urlEncode(input) {
  let str;
  if (typeof input === 'string') {
    str = btoa(unescape(encodeURIComponent(input)));
  } else {
    str = btoa(String.fromCharCode(...new Uint8Array(input)));
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Firma JWT usando RS256
 */
async function signJWT(data, privateKeyPem) {
  // Importar clave privada
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Firmar
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, dataBuffer);

  return base64urlEncode(signature);
}

/**
 * Obtiene token de acceso de Google usando JWT
 */
async function obtenerTokenGoogle(credentials) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  // Crear JWT
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedClaim = base64urlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Firmar con clave privada
  const signature = await signJWT(signatureInput, credentials.private_key);
  const jwt = `${signatureInput}.${signature}`;

  // Intercambiar JWT por access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  return data.access_token;
}

/**
 * Crea una clase de Google Wallet
 */
async function crearClase(credentials, tipo, classId, config) {
  try {
    const token = await obtenerTokenGoogle(credentials);
    const endpoint = TIPOS_PASE[tipo]?.endpoint_clase || 'genericClass';

    const payload = {
      id: classId,
      issuerName: config.issuer_name || 'Smart Passes',
      hexBackgroundColor: config.color_fondo || '#4285F4'
    };

    // Logo
    if (config.logo_url) {
      payload.logo = {
        sourceUri: { uri: config.logo_url }
      };
    }

    // Hero Image
    if (config.hero_url) {
      payload.heroImage = {
        sourceUri: { uri: config.hero_url }
      };
    }

    // Webhooks
    if (config.webhook_url) {
      payload.callbackOptions = {
        url: config.webhook_url
      };
    }

    // Crear clase (intentar POST primero)
    const response = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (response.ok || response.status === 409) {
      // 409 significa que ya existe, que está bien
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Genera link "Add to Google Wallet"
 */
function generarLinkWallet(credentials, tipo, objetoId) {
  const endpoint = TIPOS_PASE[tipo]?.endpoint_objeto || 'genericObject';

  const payload = {
    iss: credentials.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [],
    payload: {
      [`${endpoint}s`]: [{ id: objetoId }]
    }
  };

  // Generar JWT simple (para el link no necesita firma completa)
  const token = base64urlEncode(JSON.stringify(payload));

  return `https://pay.google.com/gp/v/save/${token}`;
}

/**
 * Crea un objeto (pase) de Google Wallet
 */
async function crearObjeto(credentials, tipo, classId, datos) {
  try {
    const token = await obtenerTokenGoogle(credentials);
    const endpoint = TIPOS_PASE[tipo]?.endpoint_objeto || 'genericObject';

    // Generar ID único
    const objetoId = `${classId}-${crypto.randomUUID().replace(/-/g, '')}`;

    const payload = {
      id: objetoId,
      classId: classId,
      state: 'ACTIVE'
    };

    // Título
    if (datos.nombre) {
      payload.cardTitle = {
        defaultValue: {
          language: 'es-MX',
          value: datos.nombre
        }
      };
    }

    // Header
    if (datos.titulo) {
      payload.header = {
        defaultValue: {
          language: 'es-MX',
          value: datos.titulo
        }
      };
    }

    // Módulos de texto
    if (datos.campos_texto) {
      payload.textModulesData = datos.campos_texto;
    }

    // Código de barras
    if (datos.barcode) {
      payload.barcode = datos.barcode;
    }

    // Crear objeto
    const response = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (response.ok) {
      // Generar link
      const link = generarLinkWallet(credentials, tipo, objetoId);

      return {
        success: true,
        objetoId,
        link
      };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// WORKER PRINCIPAL
// ==========================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ==========================================
      // RUTAS PÚBLICAS
      // ==========================================

      if (url.pathname === '/' && request.method === 'GET') {
        return jsonResponse({
          service: '🎫 Smart Passes Platform',
          version: '1.0.0',
          status: 'running',
          powered_by: 'Cloudflare Workers + D1 + KV',
          endpoints: {
            health: '/health',
            admin_login: '/admin/login',
            admin_dashboard: '/admin/dashboard',
            admin_crear_cliente: '/admin/crear-cliente',
            cliente_login: '/cliente/login',
            cliente_dashboard: '/cliente/dashboard',
            cliente_crear_clase: '/cliente/crear-clase',
            api_crear_pase: '/api/crear-pase',
            webhook_events: '/webhook/wallet-events'
          }
        }, corsHeaders);
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return jsonResponse({
          status: 'ok',
          timestamp: new Date().toISOString(),
          db: env.DB ? 'connected' : 'not configured',
          kv: env.SESSIONS ? 'connected' : 'not configured',
          google_wallet: env.GOOGLE_CREDENTIALS ? 'configured' : 'not configured'
        }, corsHeaders);
      }

      // ==========================================
      // ADMIN - LOGIN
      // ==========================================

      if (url.pathname === '/admin/login' && request.method === 'POST') {
        const { username, password } = await request.json();
        const hashedPassword = await hashPassword(password);

        const admin = await env.DB.prepare(
          'SELECT * FROM admin WHERE username = ? AND password = ?'
        ).bind(username, hashedPassword).first();

        if (admin) {
          const sessionId = crypto.randomUUID();
          const sessionData = {
            type: 'admin',
            username,
            createdAt: Date.now()
          };

          await env.SESSIONS.put(
            `session:${sessionId}`,
            JSON.stringify(sessionData),
            { expirationTtl: 7 * 24 * 60 * 60 }
          );

          return jsonResponse({
            success: true,
            sessionId,
            type: 'admin'
          }, corsHeaders);
        }

        return jsonResponse({
          success: false,
          error: 'Credenciales inválidas'
        }, corsHeaders, 401);
      }

      // ==========================================
      // ADMIN - DASHBOARD
      // ==========================================

      if (url.pathname === '/admin/dashboard' && request.method === 'GET') {
        const session = await validateSession(request, env, 'admin');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        // Obtener clientes
        const { results: clientes } = await env.DB.prepare(
          'SELECT id, username, nombre_negocio, email, api_key, activo, fecha_creacion FROM clientes ORDER BY fecha_creacion DESC'
        ).all();

        // Estadísticas
        const totalClientes = clientes.length;
        const pasesResult = await env.DB.prepare('SELECT COUNT(*) as count FROM pases').first();
        const clasesResult = await env.DB.prepare('SELECT COUNT(*) as count FROM clases').first();

        return jsonResponse({
          success: true,
          clientes,
          stats: {
            total_clientes: totalClientes,
            total_pases: pasesResult?.count || 0,
            total_clases: clasesResult?.count || 0
          }
        }, corsHeaders);
      }

      // ==========================================
      // ADMIN - CREAR CLIENTE
      // ==========================================

      if (url.pathname === '/admin/crear-cliente' && request.method === 'POST') {
        const session = await validateSession(request, env, 'admin');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        const datos = await request.json();
        const clienteId = datos.id.toLowerCase().trim();
        const hashedPassword = await hashPassword(datos.password);
        const apiKey = `sk_${clienteId}_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

        await env.DB.prepare(
          `INSERT INTO clientes (id, username, password, nombre_negocio, email, api_key, fecha_creacion)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          clienteId,
          clienteId,
          hashedPassword,
          datos.nombre_negocio,
          datos.email,
          apiKey,
          Date.now()
        ).run();

        return jsonResponse({
          success: true,
          cliente_id: clienteId,
          api_key: apiKey
        }, corsHeaders);
      }

      // ==========================================
      // CLIENTE - LOGIN
      // ==========================================

      if (url.pathname === '/cliente/login' && request.method === 'POST') {
        const { username, password } = await request.json();
        const hashedPassword = await hashPassword(password);

        const cliente = await env.DB.prepare(
          'SELECT * FROM clientes WHERE username = ? AND password = ? AND activo = 1'
        ).bind(username, hashedPassword).first();

        if (cliente) {
          const sessionId = crypto.randomUUID();
          const sessionData = {
            type: 'cliente',
            clienteId: cliente.id,
            username: cliente.username,
            createdAt: Date.now()
          };

          await env.SESSIONS.put(
            `session:${sessionId}`,
            JSON.stringify(sessionData),
            { expirationTtl: 7 * 24 * 60 * 60 }
          );

          return jsonResponse({
            success: true,
            sessionId,
            type: 'cliente',
            cliente: {
              id: cliente.id,
              nombre_negocio: cliente.nombre_negocio,
              email: cliente.email
            }
          }, corsHeaders);
        }

        return jsonResponse({
          success: false,
          error: 'Credenciales inválidas'
        }, corsHeaders, 401);
      }

      // ==========================================
      // CLIENTE - DASHBOARD
      // ==========================================

      if (url.pathname === '/cliente/dashboard' && request.method === 'GET') {
        const session = await validateSession(request, env, 'cliente');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        const cliente = await env.DB.prepare(
          'SELECT id, nombre_negocio, email, api_key FROM clientes WHERE id = ?'
        ).bind(session.data.clienteId).first();

        const { results: clases } = await env.DB.prepare(
          'SELECT * FROM clases WHERE cliente_id = ? ORDER BY creada_en DESC'
        ).bind(session.data.clienteId).all();

        const pasesCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM pases WHERE cliente_id = ?'
        ).bind(session.data.clienteId).first();

        return jsonResponse({
          success: true,
          cliente: {
            ...cliente,
            estadisticas: {
              pases_creados: pasesCount?.count || 0,
              clases_creadas: clases.length,
              pases_activos: pasesCount?.count || 0
            }
          },
          clases,
          tipos_pases: TIPOS_PASE
        }, corsHeaders);
      }

      // ==========================================
      // CLIENTE - CREAR CLASE
      // ==========================================

      if (url.pathname === '/cliente/crear-clase' && request.method === 'POST') {
        const session = await validateSession(request, env, 'cliente');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        const { tipo, nombre_clase, config } = await request.json();

        // Validar que tenemos credenciales de Google
        if (!env.GOOGLE_CREDENTIALS) {
          return jsonResponse({
            success: false,
            error: 'Credenciales de Google Wallet no configuradas'
          }, corsHeaders, 500);
        }

        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const issuerIdMatch = credentials.client_email.match(/(\d+)-/);
        const issuerId = issuerIdMatch ? issuerIdMatch[1] : '3388000000022737801';

        const classId = `${issuerId}.${session.data.clienteId}-${nombre_clase}`;

        // Crear clase en Google Wallet
        const resultado = await crearClase(credentials, tipo, classId, config);

        if (!resultado.success) {
          return jsonResponse({
            success: false,
            error: resultado.error
          }, corsHeaders, 500);
        }

        // Guardar en DB
        await env.DB.prepare(
          `INSERT INTO clases (id, cliente_id, tipo, nombre, config, creada_en)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          classId,
          session.data.clienteId,
          tipo,
          nombre_clase,
          JSON.stringify(config),
          Date.now()
        ).run();

        return jsonResponse({
          success: true,
          class_id: classId,
          mensaje: 'Clase creada exitosamente'
        }, corsHeaders);
      }

      // ==========================================
      // API - CREAR PASE
      // ==========================================

      if (url.pathname === '/api/crear-pase' && request.method === 'POST') {
        const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!apiKey) {
          return jsonResponse({
            success: false,
            error: 'API key no proporcionada'
          }, corsHeaders, 401);
        }

        const cliente = await env.DB.prepare(
          'SELECT * FROM clientes WHERE api_key = ? AND activo = 1'
        ).bind(apiKey).first();

        if (!cliente) {
          return jsonResponse({
            success: false,
            error: 'API key inválida'
          }, corsHeaders, 401);
        }

        const { class_id, datos } = await request.json();

        // Verificar que la clase pertenece al cliente
        const clase = await env.DB.prepare(
          'SELECT * FROM clases WHERE id = ? AND cliente_id = ?'
        ).bind(class_id, cliente.id).first();

        if (!clase) {
          return jsonResponse({
            success: false,
            error: 'Clase no encontrada'
          }, corsHeaders, 404);
        }

        // Crear objeto en Google Wallet
        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const resultado = await crearObjeto(credentials, clase.tipo, class_id, datos);

        if (!resultado.success) {
          return jsonResponse({
            success: false,
            error: resultado.error
          }, corsHeaders, 500);
        }

        // Guardar en DB
        await env.DB.prepare(
          `INSERT INTO pases (id, objeto_id, class_id, cliente_id, tipo, datos, creado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          resultado.objetoId,
          class_id,
          cliente.id,
          clase.tipo,
          JSON.stringify(datos),
          Date.now()
        ).run();

        return jsonResponse({
          success: true,
          objeto_id: resultado.objetoId,
          link: resultado.link
        }, corsHeaders);
      }

      // ==========================================
      // WEBHOOKS
      // ==========================================

      if (url.pathname === '/webhook/wallet-events' && request.method === 'POST') {
        const data = await request.json();

        console.log('🔔 Webhook recibido:', data);

        // Guardar evento
        await env.DB.prepare(
          `INSERT INTO eventos (tipo, objeto_id, class_id, datos, timestamp)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          data.eventType,
          data.objectId,
          data.classId,
          JSON.stringify(data),
          Date.now()
        ).run();

        // Actualizar estado si es delete
        if (data.eventType === 'delete') {
          await env.DB.prepare(
            'UPDATE pases SET estado = ? WHERE objeto_id = ?'
          ).bind('DELETED', data.objectId).run();
        }

        return jsonResponse({ success: true }, corsHeaders);
      }

      // 404
      return jsonResponse({
        error: 'Not Found',
        path: url.pathname
      }, corsHeaders, 404);

    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({
        success: false,
        error: error.message
      }, corsHeaders, 500);
    }
  }
};

// ==========================================
// UTILIDADES
// ==========================================

function jsonResponse(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function validateSession(request, env, requiredType = null) {
  const sessionId = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!sessionId) {
    return { valid: false };
  }

  const sessionData = await env.SESSIONS.get(`session:${sessionId}`);

  if (!sessionData) {
    return { valid: false };
  }

  const session = JSON.parse(sessionData);

  if (requiredType && session.type !== requiredType) {
    return { valid: false };
  }

  return { valid: true, data: session };
}
