/**
 * Smart Passes Platform - Cloudflare Worker V2
 * Sistema completo de Google Wallet con funcionalidades avanzadas
 * VERSIÓN CONSOLIDADA MEJORADA PARA QUICK EDIT
 */

// ==========================================
// GOOGLE WALLET INTEGRATION - TIPOS DE PASES
// ==========================================

const TIPOS_PASE = {
  'generic': {
    nombre: 'Genérico',
    descripcion: 'Pase general para cualquier propósito',
    endpoint_clase: 'genericClass',
    endpoint_objeto: 'genericObject',
    icono: '🎫'
  },
  'loyalty': {
    nombre: 'Lealtad',
    descripcion: 'Programas de puntos y recompensas',
    endpoint_clase: 'loyaltyClass',
    endpoint_objeto: 'loyaltyObject',
    icono: '⭐'
  },
  'offer': {
    nombre: 'Oferta/Cupón',
    descripcion: 'Cupones de descuento y promociones',
    endpoint_clase: 'offerClass',
    endpoint_objeto: 'offerObject',
    icono: '🎁'
  },
  'giftcard': {
    nombre: 'Tarjeta de Regalo',
    descripcion: 'Tarjetas con saldo prepagado',
    endpoint_clase: 'giftCardClass',
    endpoint_objeto: 'giftCardObject',
    icono: '💳'
  },
  'eventticket': {
    nombre: 'Boleto de Evento',
    descripcion: 'Entradas para eventos y conciertos',
    endpoint_clase: 'eventTicketClass',
    endpoint_objeto: 'eventTicketObject',
    icono: '🎟️'
  },
  'transit': {
    nombre: 'Transporte',
    descripcion: 'Pases de transporte público',
    endpoint_clase: 'transitClass',
    endpoint_objeto: 'transitObject',
    icono: '🚇'
  },
  'flight': {
    nombre: 'Pase de Abordar',
    descripcion: 'Pases de abordaje para vuelos',
    endpoint_clase: 'flightClass',
    endpoint_objeto: 'flightObject',
    icono: '✈️'
  }
};

// ==========================================
// UTILIDADES BASE64 Y JWT
// ==========================================

function base64urlEncode(input) {
  let str;
  if (typeof input === 'string') {
    str = btoa(unescape(encodeURIComponent(input)));
  } else {
    str = btoa(String.fromCharCode(...new Uint8Array(input)));
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signJWT(data, privateKeyPem) {
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
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, dataBuffer);

  return base64urlEncode(signature);
}

async function obtenerTokenGoogle(credentials) {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedClaim = base64urlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const signature = await signJWT(signatureInput, credentials.private_key);
  const jwt = `${signatureInput}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  return data.access_token;
}

// ==========================================
// CONSTRUCCIÓN DE TEMPLATES
// ==========================================

function construirTemplateLealtad(memberFields) {
  /**
   * Construye template para estructurar datos del miembro en filas
   * Args: memberFields: ['nombre', 'nivel', 'descuento', 'telefono']
   */
  const filas = memberFields.map(fieldId => ({
    oneItem: {
      item: {
        firstValue: {
          fields: [{ fieldPath: `object.textModulesData['${fieldId}']` }]
        }
      }
    }
  }));

  return {
    cardTemplateOverride: {
      cardRowTemplateInfos: filas
    }
  };
}

function construirTemplate(campos) {
  /**
   * Construye template genérico para campos personalizados
   */
  if (!campos || campos.length === 0) return null;

  return {
    cardTemplateOverride: {
      cardRowTemplateInfos: campos.map(campo => ({
        oneItem: {
          item: {
            firstValue: {
              fields: [{ fieldPath: campo.fieldPath }]
            }
          }
        }
      }))
    }
  };
}

// ==========================================
// CREAR CLASES - ESTRUCTURA BASE
// ==========================================

function crearClaseGenerica(classId, config) {
  /**
   * Crea la estructura base de una clase (común a todos los tipos)
   */
  const payload = {
    id: classId,
    issuerName: config.issuer_name || 'Smart Passes',
    hexBackgroundColor: config.color_fondo || '#4285F4',
    reviewStatus: 'UNDER_REVIEW'
  };

  // Logo
  if (config.logo_url) {
    payload.logo = {
      sourceUri: { uri: config.logo_url }
    };
  }

  // Imagen Hero
  if (config.hero_url) {
    payload.heroImage = {
      sourceUri: { uri: config.hero_url }
    };
  }

  // Template de campos
  if (config.campos) {
    const template = construirTemplate(config.campos);
    if (template) payload.classTemplateInfo = template;
  }

  // Enlaces/botones
  if (config.enlaces) {
    payload.linksModuleData = {
      uris: config.enlaces
    };
  }

  // Webhooks
  if (config.webhook_url || config.update_request_url) {
    payload.callbackOptions = {};
    if (config.webhook_url) payload.callbackOptions.url = config.webhook_url;
    if (config.update_request_url) payload.callbackOptions.updateRequestUrl = config.update_request_url;
  }

  return payload;
}

// ==========================================
// CREAR CLASES - TIPOS ESPECÍFICOS
// ==========================================

function crearClaseLealtad(classId, config) {
  /**
   * Crea clase de programa de lealtad con estructura visual mejorada
   *
   * ESTRUCTURA VISUAL:
   * 1. Strip superior: wideLogo (banner ancho) O programLogo (logo pequeño)
   * 2. Nombre del programa
   * 3. Imagen central VIP (imageModulesData) - Banner 3:1 en el frente
   * 4. Datos del miembro: Filas estructuradas (nombre, nivel, etc.)
   * 5. QR code + número de membresía
   */
  const payload = crearClaseGenerica(classId, config);

  // 1. STRIP SUPERIOR - Nombre del programa
  payload.programName = config.program_name || config.issuer_name || 'Programa de Lealtad';

  // 2. STRIP SUPERIOR - Imagen/Logo
  // wideLogo = Banner ancho superior (660x210px) - estilo PassSlot
  // programLogo = Logo pequeño cuadrado
  if (config.wide_logo_url) {
    // Banner ancho en la parte superior (como PassSlot)
    payload.wideLogo = {
      sourceUri: { uri: config.wide_logo_url }
    };
    // Si hay wideLogo, no usar programLogo
    if (payload.logo) delete payload.logo;
  } else if (payload.logo) {
    // Logo pequeño tradicional
    payload.programLogo = payload.logo;
    delete payload.logo;
  } else if (config.strip_logo_url) {
    payload.programLogo = {
      sourceUri: { uri: config.strip_logo_url }
    };
  }

  // 3. IMAGEN CENTRAL VIP - Banner rectangular (3:1) EN EL FRENTE
  if (config.central_image_url) {
    payload.imageModulesData = [{
      id: 'vip_banner',
      mainImage: {
        sourceUri: { uri: config.central_image_url },
        contentDescription: {
          defaultValue: {
            language: 'es-MX',
            value: config.central_image_description || 'Miembro VIP'
          }
        }
      }
    }];
  }

  // IMPORTANTE: Eliminar heroImage porque aparece al FINAL (atrás) de la tarjeta
  // Para loyalty usamos imageModulesData que aparece en el FRENTE
  if (payload.heroImage) {
    delete payload.heroImage;
  }

  // 4. TEMPLATE - Estructura de filas para datos del miembro
  if (config.member_fields) {
    payload.classTemplateInfo = construirTemplateLealtad(config.member_fields);
  }

  // Niveles de recompensa
  if (config.reward_tiers) {
    payload.rewardsTier = config.reward_tiers;
  }

  return payload;
}

function crearClaseOferta(classId, config) {
  const payload = crearClaseGenerica(classId, config);

  payload.provider = config.provider || 'Smart Passes';
  payload.title = config.offer_title || 'Oferta Especial';
  payload.redemptionChannel = config.redemption_channel || 'online';

  return payload;
}

function crearClaseGiftcard(classId, config) {
  const payload = crearClaseGenerica(classId, config);

  payload.merchantName = config.merchant_name || config.issuer_name || 'Smart Passes';

  if (payload.logo) {
    payload.programLogo = payload.logo;
    delete payload.logo;
  }

  payload.allowMultipleUsersPerObject = false;

  return payload;
}

function crearClaseEvento(classId, config) {
  const payload = crearClaseGenerica(classId, config);

  payload.eventName = {
    defaultValue: {
      language: 'es-MX',
      value: config.event_name || 'Evento'
    }
  };

  if (config.venue) {
    payload.venue = {
      name: {
        defaultValue: {
          language: 'es-MX',
          value: config.venue
        }
      }
    };
  }

  return payload;
}

function crearClaseTransito(classId, config) {
  const payload = crearClaseGenerica(classId, config);

  payload.transitType = config.transit_type || 'BUS';
  payload.transitOperatorName = {
    defaultValue: {
      language: 'es-MX',
      value: config.operator_name || 'Operador de Transporte'
    }
  };

  return payload;
}

function crearClaseVuelo(classId, config) {
  const payload = crearClaseGenerica(classId, config);

  payload.flightHeader = {
    carrier: {
      carrierIataCode: config.airline_code || 'XX'
    },
    flightNumber: {
      defaultValue: {
        language: 'es-MX',
        value: config.flight_number || '000'
      }
    }
  };

  payload.origin = {
    terminal: config.origin_terminal || '1',
    gate: config.origin_gate || 'A1',
    airportIataCode: config.origin_code || 'MEX'
  };

  payload.destination = {
    terminal: config.dest_terminal || '1',
    gate: config.dest_gate || 'B1',
    airportIataCode: config.dest_code || 'LAX'
  };

  return payload;
}

// ==========================================
// CREAR CLASE EN GOOGLE WALLET API
// ==========================================

async function crearClase(credentials, tipo, classId, config) {
  try {
    const funciones = {
      'generic': crearClaseGenerica,
      'loyalty': crearClaseLealtad,
      'offer': crearClaseOferta,
      'giftcard': crearClaseGiftcard,
      'eventticket': crearClaseEvento,
      'transit': crearClaseTransito,
      'flight': crearClaseVuelo
    };

    if (!funciones[tipo]) {
      return { success: false, error: `Tipo de pase no válido: ${tipo}` };
    }

    const payload = funciones[tipo](classId, config);
    const token = await obtenerTokenGoogle(credentials);
    const endpoint = TIPOS_PASE[tipo].endpoint_clase;

    // Intentar PATCH primero (actualizar)
    let response = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}/${classId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    // Si no existe (404), crear nuevo (POST)
    if (response.status === 404) {
      response = await fetch(
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
    }

    if (response.ok || response.status === 409) {
      return { success: true };
    } else {
      const errorText = await response.text();
      let errorMsg = errorText;

      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error?.message || errorJson.message || errorText;
      } catch (e) {
        // Si no es JSON, usar el texto tal cual
      }

      console.error('Error de Google Wallet API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMsg
      });

      return {
        success: false,
        error: `Error ${response.status}: ${errorMsg}`
      };
    }
  } catch (error) {
    console.error('Error en crearClase:', error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// EDITAR CLASE EXISTENTE
// ==========================================

async function editarClase(credentials, tipo, classId, nuevaConfig) {
  /**
   * Actualiza clase existente usando PATCH con updateMask=*
   * Los cambios se reflejan en todos los pases existentes
   */
  try {
    const funciones = {
      'generic': crearClaseGenerica,
      'loyalty': crearClaseLealtad,
      'offer': crearClaseOferta,
      'giftcard': crearClaseGiftcard,
      'eventticket': crearClaseEvento,
      'transit': crearClaseTransito,
      'flight': crearClaseVuelo
    };

    if (!funciones[tipo]) {
      return { success: false, error: `Tipo de pase no válido: ${tipo}` };
    }

    const payload = funciones[tipo](classId, nuevaConfig);
    const token = await obtenerTokenGoogle(credentials);
    const endpoint = TIPOS_PASE[tipo].endpoint_clase;

    const response = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}/${classId}?updateMask=*`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (response.ok) {
      return { success: true, mensaje: 'Clase actualizada exitosamente' };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// CREAR OBJETO (PASE INDIVIDUAL)
// ==========================================

async function crearObjeto(credentials, tipo, classId, datos) {
  try {
    const token = await obtenerTokenGoogle(credentials);
    const endpoint = TIPOS_PASE[tipo]?.endpoint_objeto || 'genericObject';

    const objetoId = `${classId}-${crypto.randomUUID().replace(/-/g, '')}`;

    const payload = {
      id: objetoId,
      classId: classId,
      state: 'ACTIVE'
    };

    // Título de la tarjeta
    if (datos.nombre) {
      payload.cardTitle = {
        defaultValue: {
          language: 'es-MX',
          value: datos.nombre
        }
      };
    }

    // Encabezado
    if (datos.titulo) {
      payload.header = {
        defaultValue: {
          language: 'es-MX',
          value: datos.titulo
        }
      };
    }

    // Campos de texto personalizados
    if (datos.campos_texto) {
      payload.textModulesData = datos.campos_texto;
    }

    // Código de barras/QR
    if (datos.barcode) {
      payload.barcode = datos.barcode;
    }

    // ESPECÍFICO PARA LOYALTY
    if (tipo === 'loyalty') {
      // Contador de puntos
      if (datos.puntos !== null && datos.puntos !== undefined && datos.puntos !== '') {
        try {
          const puntosInt = parseInt(datos.puntos);
          payload.loyaltyPoints = {
            label: 'PUNTOS',
            balance: { int: puntosInt }
          };
        } catch (e) {
          // Ignorar si no es válido
        }
      }

      // Número de cuenta/membresía
      const accountId = datos.account_id || datos.numero_membresia;
      if (accountId && String(accountId).trim()) {
        payload.accountId = String(accountId).trim();
      }
    }

    // ESPECÍFICO PARA GIFTCARD
    if (tipo === 'giftcard' && datos.saldo) {
      payload.balance = {
        micros: parseInt(datos.saldo * 1000000),
        currencyCode: datos.moneda || 'MXN'
      };
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
      const link = await generarLinkWallet(credentials, tipo, objetoId);
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
// ACTUALIZAR PASE EXISTENTE
// ==========================================

async function actualizarPase(credentials, tipo, objetoId, datosActualizados) {
  /**
   * Actualiza campos de un pase existente usando PATCH
   * Google Wallet envía notificación automática si detecta cambios importantes
   */
  try {
    if (!TIPOS_PASE[tipo]) {
      return { success: false, error: `Tipo de pase no válido: ${tipo}` };
    }

    const endpoint = TIPOS_PASE[tipo].endpoint_objeto;
    const token = await obtenerTokenGoogle(credentials);

    const payload = {};

    // Actualizar campos de texto
    if (datosActualizados.campos_texto) {
      payload.textModulesData = datosActualizados.campos_texto;
    }

    // Actualizar puntos (solo loyalty)
    if (tipo === 'loyalty' && datosActualizados.puntos !== null && datosActualizados.puntos !== undefined) {
      try {
        const puntosInt = parseInt(datosActualizados.puntos);
        payload.loyaltyPoints = {
          label: 'PUNTOS',
          balance: { int: puntosInt }
        };
      } catch (e) {
        // Ignorar
      }
    }

    // Actualizar saldo (solo giftcard)
    if (tipo === 'giftcard' && datosActualizados.saldo !== null && datosActualizados.saldo !== undefined) {
      payload.balance = {
        micros: parseInt(datosActualizados.saldo * 1000000),
        currencyCode: datosActualizados.moneda || 'MXN'
      };
    }

    const response = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}/${objetoId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (response.ok) {
      return {
        success: true,
        mensaje: 'Pase actualizado. Google Wallet enviará notificación automática si hubo cambios importantes.'
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
// NOTIFICACIONES PUSH
// ==========================================

async function enviarNotificacionPase(credentials, tipo, objetoId, mensaje) {
  /**
   * Envía notificación push a UN pase específico
   */
  try {
    if (!TIPOS_PASE[tipo]) {
      return { success: false, error: `Tipo de pase no válido: ${tipo}` };
    }

    const endpoint = TIPOS_PASE[tipo].endpoint_objeto;
    const token = await obtenerTokenGoogle(credentials);

    const mensajeObj = {
      header: mensaje.header || 'Actualización',
      body: mensaje.body || mensaje,
      id: `msg_${Date.now()}`,
      messageType: 'TEXT'
    };

    const response = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}/${objetoId}/addMessage`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: mensajeObj })
      }
    );

    if (response.ok) {
      return { success: true, mensaje: 'Notificación enviada' };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function enviarNotificacionClase(credentials, tipo, classId, mensaje) {
  /**
   * Envía notificación push a TODOS los pases de una clase
   */
  try {
    if (!TIPOS_PASE[tipo]) {
      return { success: false, error: `Tipo de pase no válido: ${tipo}` };
    }

    const endpoint = TIPOS_PASE[tipo].endpoint_clase;
    const token = await obtenerTokenGoogle(credentials);

    const mensajeObj = {
      header: mensaje.header || 'Actualización',
      body: mensaje.body || mensaje,
      id: `msg_${Date.now()}`,
      messageType: 'TEXT'
    };

    const response = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}/${classId}/addMessage`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: mensajeObj })
      }
    );

    if (response.ok) {
      return { success: true, mensaje: 'Notificación masiva enviada' };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// GENERAR LINK "ADD TO WALLET"
// ==========================================

async function generarLinkWallet(credentials, tipo, objetoId) {
  const endpoint = TIPOS_PASE[tipo]?.endpoint_objeto || 'genericObject';

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

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

  // Generar JWT firmado correctamente (header.payload.signature)
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await signJWT(signatureInput, credentials.private_key);
  const jwt = `${signatureInput}.${signature}`;

  return `https://pay.google.com/gp/v/save/${jwt}`;
}

// ==========================================
// WORKER PRINCIPAL
// ==========================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // RUTAS PÚBLICAS
      if (url.pathname === '/' && request.method === 'GET') {
        return jsonResponse({
          service: '🎫 Smart Passes Platform V2',
          version: '2.0.0',
          status: 'running',
          powered_by: 'Cloudflare Workers + D1 + KV',
          tipos_pases: Object.keys(TIPOS_PASE),
          endpoints: {
            health: '/health',
            admin_login: '/admin/login',
            admin_dashboard: '/admin/dashboard',
            admin_crear_cliente: '/admin/crear-cliente',
            cliente_login: '/cliente/login',
            cliente_dashboard: '/cliente/dashboard',
            cliente_pases: '/cliente/pases',
            cliente_eventos: '/cliente/eventos',
            cliente_crear_clase: '/cliente/crear-clase',
            cliente_editar_clase: '/cliente/editar-clase',
            cliente_eliminar_clase: '/cliente/eliminar-clase',
            api_crear_pase: '/api/crear-pase',
            api_actualizar_pase: '/api/actualizar-pase',
            api_notificar_pase: '/api/notificar-pase',
            api_notificar_clase: '/api/notificar-clase',
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
          google_wallet: env.GOOGLE_CREDENTIALS ? 'configured' : 'not configured',
          version: '2.0.0'
        }, corsHeaders);
      }

      // ADMIN - LOGIN
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

      // ADMIN - DASHBOARD
      if (url.pathname === '/admin/dashboard' && request.method === 'GET') {
        const session = await validateSession(request, env, 'admin');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        const { results: clientes } = await env.DB.prepare(
          'SELECT id, username, nombre_negocio, email, api_key, activo, fecha_creacion FROM clientes ORDER BY fecha_creacion DESC'
        ).all();

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

      // ADMIN - CREAR CLIENTE
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

      // CLIENTE - LOGIN
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

      // CLIENTE - DASHBOARD
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

      // CLIENTE - OBTENER PASES
      if (url.pathname === '/cliente/pases' && request.method === 'GET') {
        const session = await validateSession(request, env, 'cliente');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        // Obtener parámetro opcional de filtro por clase
        const classId = url.searchParams.get('class_id');

        let query = `
          SELECT
            p.*,
            c.nombre as nombre_clase,
            c.tipo as tipo_clase
          FROM pases p
          LEFT JOIN clases c ON p.class_id = c.id
          WHERE p.cliente_id = ?
        `;

        const params = [session.data.clienteId];

        if (classId) {
          query += ' AND p.class_id = ?';
          params.push(classId);
        }

        query += ' ORDER BY p.creado_en DESC';

        const { results: pases } = await env.DB.prepare(query).bind(...params).all();

        // Parsear los datos JSON de cada pase y generar link firmado
        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const pasesFormateados = await Promise.all(pases.map(async pase => ({
          ...pase,
          datos: typeof pase.datos === 'string' ? JSON.parse(pase.datos) : pase.datos,
          link: await generarLinkWallet(credentials, pase.tipo, pase.objeto_id)
        })));

        return jsonResponse({
          success: true,
          pases: pasesFormateados,
          total: pases.length
        }, corsHeaders);
      }

      // CLIENTE - OBTENER EVENTOS/WEBHOOKS
      if (url.pathname === '/cliente/eventos' && request.method === 'GET') {
        const session = await validateSession(request, env, 'cliente');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Obtener eventos relacionados con pases del cliente
        const { results: eventos } = await env.DB.prepare(`
          SELECT e.*
          FROM eventos e
          INNER JOIN pases p ON e.objeto_id = p.objeto_id
          WHERE p.cliente_id = ?
          ORDER BY e.timestamp DESC
          LIMIT ? OFFSET ?
        `).bind(session.data.clienteId, limit, offset).all();

        // Parsear datos JSON de cada evento
        const eventosFormateados = eventos.map(evento => ({
          ...evento,
          datos: typeof evento.datos === 'string' ? JSON.parse(evento.datos) : evento.datos
        }));

        // Estadísticas
        const stats = await env.DB.prepare(`
          SELECT
            e.tipo,
            COUNT(*) as count
          FROM eventos e
          INNER JOIN pases p ON e.objeto_id = p.objeto_id
          WHERE p.cliente_id = ?
          GROUP BY e.tipo
        `).bind(session.data.clienteId).all();

        return jsonResponse({
          success: true,
          eventos: eventosFormateados,
          total: eventos.length,
          estadisticas: stats.results || []
        }, corsHeaders);
      }

      // CLIENTE - CREAR CLASE
      if (url.pathname === '/cliente/crear-clase' && request.method === 'POST') {
        const session = await validateSession(request, env, 'cliente');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        const { tipo, nombre_clase, config } = await request.json();

        if (!env.GOOGLE_CREDENTIALS) {
          return jsonResponse({
            success: false,
            error: 'Credenciales de Google Wallet no configuradas'
          }, corsHeaders, 500);
        }

        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const issuerIdMatch = credentials.client_email.match(/(\d+)-/);
        const issuerId = issuerIdMatch ? issuerIdMatch[1] : '3388000000022737801';

        // Sanitizar nombre_clase: eliminar espacios y caracteres especiales
        const sanitizedName = nombre_clase
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, '-')  // Reemplazar caracteres no permitidos con guiones
          .replace(/-+/g, '-')           // Evitar guiones múltiples consecutivos
          .replace(/^-|-$/g, '');        // Eliminar guiones al inicio o final

        // Generar ID único incluyendo timestamp
        const uniqueId = Date.now().toString(36); // Base36 para acortar
        const classId = `${issuerId}.${session.data.clienteId}-${sanitizedName}-${uniqueId}`;

        const resultado = await crearClase(credentials, tipo, classId, config);

        if (!resultado.success) {
          return jsonResponse({
            success: false,
            error: resultado.error
          }, corsHeaders, 500);
        }

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

      // CLIENTE - EDITAR CLASE
      if (url.pathname === '/cliente/editar-clase' && request.method === 'POST') {
        const session = await validateSession(request, env, 'cliente');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        const { class_id, nueva_config } = await request.json();

        // Verificar que la clase pertenece al cliente
        const clase = await env.DB.prepare(
          'SELECT * FROM clases WHERE id = ? AND cliente_id = ?'
        ).bind(class_id, session.data.clienteId).first();

        if (!clase) {
          return jsonResponse({
            success: false,
            error: 'Clase no encontrada'
          }, corsHeaders, 404);
        }

        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const resultado = await editarClase(credentials, clase.tipo, class_id, nueva_config);

        if (!resultado.success) {
          return jsonResponse({
            success: false,
            error: resultado.error
          }, corsHeaders, 500);
        }

        // Actualizar en DB
        await env.DB.prepare(
          'UPDATE clases SET config = ? WHERE id = ?'
        ).bind(JSON.stringify(nueva_config), class_id).run();

        return jsonResponse({
          success: true,
          mensaje: 'Clase actualizada exitosamente'
        }, corsHeaders);
      }

      // CLIENTE - ELIMINAR CLASE
      if (url.pathname === '/cliente/eliminar-clase' && request.method === 'POST') {
        const session = await validateSession(request, env, 'cliente');
        if (!session.valid) {
          return jsonResponse({ error: 'No autorizado' }, corsHeaders, 401);
        }

        const { class_id } = await request.json();

        // Verificar que la clase pertenece al cliente
        const clase = await env.DB.prepare(
          'SELECT * FROM clases WHERE id = ? AND cliente_id = ?'
        ).bind(class_id, session.data.clienteId).first();

        if (!clase) {
          return jsonResponse({
            success: false,
            error: 'Clase no encontrada'
          }, corsHeaders, 404);
        }

        // Verificar si hay pases asociados a esta clase
        const pasesCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM pases WHERE class_id = ?'
        ).bind(class_id).first();

        if (pasesCount.count > 0) {
          return jsonResponse({
            success: false,
            error: `No se puede eliminar la clase porque tiene ${pasesCount.count} pase(s) asociado(s). Primero elimina los pases.`
          }, corsHeaders, 400);
        }

        // Eliminar clase de la base de datos
        await env.DB.prepare(
          'DELETE FROM clases WHERE id = ?'
        ).bind(class_id).run();

        return jsonResponse({
          success: true,
          mensaje: 'Clase eliminada exitosamente'
        }, corsHeaders);
      }

      // API - CREAR PASE
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

        const clase = await env.DB.prepare(
          'SELECT * FROM clases WHERE id = ? AND cliente_id = ?'
        ).bind(class_id, cliente.id).first();

        if (!clase) {
          return jsonResponse({
            success: false,
            error: 'Clase no encontrada'
          }, corsHeaders, 404);
        }

        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const resultado = await crearObjeto(credentials, clase.tipo, class_id, datos);

        if (!resultado.success) {
          return jsonResponse({
            success: false,
            error: resultado.error
          }, corsHeaders, 500);
        }

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

      // API - ACTUALIZAR PASE
      if (url.pathname === '/api/actualizar-pase' && request.method === 'POST') {
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

        const { objeto_id, datos_actualizados } = await request.json();

        // Verificar que el pase pertenece al cliente
        const pase = await env.DB.prepare(
          'SELECT * FROM pases WHERE objeto_id = ? AND cliente_id = ?'
        ).bind(objeto_id, cliente.id).first();

        if (!pase) {
          return jsonResponse({
            success: false,
            error: 'Pase no encontrado'
          }, corsHeaders, 404);
        }

        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const resultado = await actualizarPase(credentials, pase.tipo, objeto_id, datos_actualizados);

        if (!resultado.success) {
          return jsonResponse({
            success: false,
            error: resultado.error
          }, corsHeaders, 500);
        }

        // Actualizar en DB
        await env.DB.prepare(
          'UPDATE pases SET datos = ?, actualizado_en = ? WHERE objeto_id = ?'
        ).bind(JSON.stringify(datos_actualizados), Date.now(), objeto_id).run();

        return jsonResponse(resultado, corsHeaders);
      }

      // API - NOTIFICAR PASE
      if (url.pathname === '/api/notificar-pase' && request.method === 'POST') {
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

        const { objeto_id, mensaje } = await request.json();

        const pase = await env.DB.prepare(
          'SELECT * FROM pases WHERE objeto_id = ? AND cliente_id = ?'
        ).bind(objeto_id, cliente.id).first();

        if (!pase) {
          return jsonResponse({
            success: false,
            error: 'Pase no encontrado'
          }, corsHeaders, 404);
        }

        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const resultado = await enviarNotificacionPase(credentials, pase.tipo, objeto_id, mensaje);

        return jsonResponse(resultado, corsHeaders);
      }

      // API - NOTIFICAR CLASE (MASIVO)
      if (url.pathname === '/api/notificar-clase' && request.method === 'POST') {
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

        const { class_id, mensaje } = await request.json();

        const clase = await env.DB.prepare(
          'SELECT * FROM clases WHERE id = ? AND cliente_id = ?'
        ).bind(class_id, cliente.id).first();

        if (!clase) {
          return jsonResponse({
            success: false,
            error: 'Clase no encontrada'
          }, corsHeaders, 404);
        }

        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const resultado = await enviarNotificacionClase(credentials, clase.tipo, class_id, mensaje);

        return jsonResponse(resultado, corsHeaders);
      }

      // WEBHOOKS
      if (url.pathname === '/webhook/wallet-events' && request.method === 'POST') {
        const data = await request.json();

        console.log('🔔 Webhook recibido:', data);

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
