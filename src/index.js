/**
 * Smart Passes Platform - Cloudflare Worker Principal
 * API para gestión de pases digitales de Google Wallet
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ==========================================
    // RUTAS PÚBLICAS
    // ==========================================

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(JSON.stringify({
        service: '🎫 Smart Passes Platform',
        version: '1.0.0',
        status: 'running',
        powered_by: 'Cloudflare Workers',
        endpoints: {
          health: '/health',
          admin_login: '/admin/login',
          cliente_login: '/cliente/login',
          api_crear_pase: '/api/crear-pase',
          webhook_events: '/webhook/wallet-events'
        }
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // ==========================================
    // ADMIN - LOGIN
    // ==========================================

    if (url.pathname === '/admin/login' && request.method === 'POST') {
      try {
        const { username, password } = await request.json();

        // Validar contra D1 (cuando esté configurado)
        if (env.DB) {
          const hashedPassword = await hashPassword(password);
          const admin = await env.DB.prepare(
            'SELECT * FROM admin WHERE username = ? AND password = ?'
          ).bind(username, hashedPassword).first();

          if (admin) {
            // Crear sesión en KV
            const sessionId = crypto.randomUUID();
            const sessionData = {
              type: 'admin',
              username,
              createdAt: Date.now()
            };

            if (env.SESSIONS) {
              await env.SESSIONS.put(
                `session:${sessionId}`,
                JSON.stringify(sessionData),
                { expirationTtl: 7 * 24 * 60 * 60 } // 7 días
              );
            }

            return new Response(JSON.stringify({
              success: true,
              sessionId,
              type: 'admin'
            }), {
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
        }

        // Credenciales por defecto para testing (sin DB)
        if (username === 'admin' && password === 'admin123') {
          return new Response(JSON.stringify({
            success: true,
            sessionId: 'test-session-' + Date.now(),
            type: 'admin',
            message: 'Login de prueba (DB no configurada)'
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        return new Response(JSON.stringify({
          success: false,
          error: 'Credenciales inválidas'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    // ==========================================
    // API - CREAR PASE
    // ==========================================

    if (url.pathname === '/api/crear-pase' && request.method === 'POST') {
      try {
        // Validar API Key
        const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!apiKey) {
          return new Response(JSON.stringify({
            success: false,
            error: 'API key no proporcionada'
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        const { class_id, datos } = await request.json();

        // TODO: Validar API key contra DB
        // TODO: Crear objeto en Google Wallet
        // TODO: Generar link

        return new Response(JSON.stringify({
          success: true,
          message: 'Funcionalidad en desarrollo',
          objeto_id: 'test-' + crypto.randomUUID(),
          link: 'https://pay.google.com/gp/v/save/TEST'
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    // ==========================================
    // WEBHOOKS
    // ==========================================

    if (url.pathname === '/webhook/wallet-events' && request.method === 'POST') {
      try {
        const data = await request.json();

        console.log('🔔 Webhook recibido:', data);

        // Guardar evento en DB
        if (env.DB) {
          await env.DB.prepare(
            'INSERT INTO eventos (tipo, objeto_id, class_id, datos, timestamp) VALUES (?, ?, ?, ?, ?)'
          ).bind(
            data.eventType,
            data.objectId,
            data.classId,
            JSON.stringify(data),
            Date.now()
          ).run();
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    // ==========================================
    // 404 - NOT FOUND
    // ==========================================

    return new Response(JSON.stringify({
      error: 'Not Found',
      path: url.pathname
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};

// ==========================================
// UTILIDADES
// ==========================================

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
