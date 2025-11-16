/**
 * Google Wallet Integration - Cloudflare Workers
 * Manejo completo de pases digitales
 */

// Tipos de pases soportados
export const TIPOS_PASE = {
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
 * Obtiene token de acceso de Google usando JWT
 */
export async function obtenerTokenGoogle(credentials) {
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
 * Crea una clase de Google Wallet
 */
export async function crearClase(credentials, tipo, classId, config) {
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
 * Crea un objeto (pase) de Google Wallet
 */
export async function crearObjeto(credentials, tipo, classId, datos) {
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
 * Envía notificación a un pase
 */
export async function enviarNotificacion(credentials, tipo, objetoId, mensaje) {
  try {
    const token = await obtenerTokenGoogle(credentials);
    const endpoint = TIPOS_PASE[tipo]?.endpoint_objeto || 'genericObject';

    // Obtener objeto actual
    const getResponse = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}/${objetoId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!getResponse.ok) {
      return { success: false, error: 'Objeto no encontrado' };
    }

    const objeto = await getResponse.json();

    // Agregar mensaje
    if (!objeto.messages) {
      objeto.messages = [];
    }

    objeto.messages.push({
      header: mensaje.header,
      body: mensaje.body
    });

    // Actualizar
    const updateResponse = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/${endpoint}/${objetoId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(objeto)
      }
    );

    if (updateResponse.ok) {
      return { success: true };
    } else {
      const error = await updateResponse.text();
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}
