# Crea este archivo (es el corazón del servidor):
cat > server.js << 'EOF'
// ============================================
// SERVIDOR PROXY PARA WHATSAPP BOT
// ============================================

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURACIÓN ==========
app.use(cors()); // Permite conexiones desde cualquier lugar
app.use(express.json()); // Para recibir JSON

// Tu API Key de OpenRouter (la pones en Railway después)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ========== RUTAS ==========

// 1. Página de inicio (para probar que funciona)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Servidor WhatsApp Bot</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 800px; 
          margin: 50px auto; 
          padding: 20px; 
          background: #f5f5f5;
        }
        .container { 
          background: white; 
          padding: 30px; 
          border-radius: 10px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #25D366; }
        .status { 
          background: #4CAF50; 
          color: white; 
          padding: 10px; 
          border-radius: 5px; 
          display: inline-block;
        }
        code { 
          background: #f0f0f0; 
          padding: 2px 5px; 
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Servidor WhatsApp Bot</h1>
        <p class="status">✅ EN LÍNEA</p>
        
        <h2>📡 Endpoints disponibles:</h2>
        <ul>
          <li><code>POST /api/chat</code> - Para conversación con IA</li>
          <li><code>GET /health</code> - Para verificar estado</li>
        </ul>
        
        <h2>🔧 Cómo usar:</h2>
        <p>Tu bot de WhatsApp debe enviar peticiones a:</p>
        <code>https://[TU-DOMINIO-RAILWAY]/api/chat</code>
        
        <h2>📊 Estado del servicio:</h2>
        <p>🟢 OpenRouter: ${OPENROUTER_API_KEY ? 'Conectado' : 'Configurar API Key'}</p>
        <p>🟢 Servidor: Funcionando en puerto ${PORT}</p>
        
        <hr>
        <p><small>Creado para WhatsApp Bot con OpenRouter</small></p>
      </div>
    </body>
    </html>
  `);
});

// 2. Ruta de salud (para verificar que el servidor funciona)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Bot Proxy',
    openrouter: OPENROUTER_API_KEY ? 'configured' : 'not_configured'
  });
});

// 3. Ruta principal para IA
app.post('/api/chat', async (req, res) => {
  console.log('📨 Mensaje recibido en servidor:', {
    message: req.body.message?.substring(0, 100),
    ip: req.ip,
    time: new Date().toLocaleTimeString()
  });

  // Verificar que hay mensaje
  if (!req.body.message || req.body.message.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'No se envió ningún mensaje',
      example: { "message": "Hola, ¿cómo estás?" }
    });
  }

  const userMessage = req.body.message;

  try {
    // ========== CONEXIÓN CON OPENROUTER ==========
    console.log('🔗 Conectando con OpenRouter...');
    
    const openrouterResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo', // Modelo gratis o el que uses
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente útil y amigable para WhatsApp. Responde en español de manera natural, clara y concisa. Usa emojis apropiados.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 500, // Límite de respuesta
        temperature: 0.7 // Creatividad
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://railway.app', // Identifica tu app
          'X-Title': 'WhatsApp Bot Assistant'
        },
        timeout: 25000 // 25 segundos máximo
      }
    );

    // Extraer respuesta de OpenRouter
    const aiResponse = openrouterResponse.data.choices[0].message.content;
    
    console.log('✅ OpenRouter respondió:', aiResponse.substring(0, 80) + '...');

    // Enviar respuesta al bot
    res.json({
      success: true,
      response: aiResponse,
      model: openrouterResponse.data.model,
      tokens_used: openrouterResponse.data.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('❌ Error con OpenRouter:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    // Respuesta de error amigable
    let errorMessage = 'Lo siento, hubo un error al procesar tu mensaje.';
    let statusCode = 500;

    if (error.response?.status === 401) {
      errorMessage = 'Error de autenticación con OpenRouter. Verifica la API Key.';
      statusCode = 401;
    } else if (error.response?.status === 429) {
      errorMessage = 'Límite de solicitudes alcanzado. Intenta más tarde.';
      statusCode = 429;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'No se puede conectar con el servicio de IA.';
      statusCode = 502;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      fallback_response: `Recibí tu mensaje: "${userMessage.substring(0, 100)}". Estamos teniendo dificultades técnicas.`
    });
  }
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 SERVIDOR INICIADO`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`💬 Endpoint IA: http://localhost:${PORT}/api/chat`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
  console.log('📝 Para OpenRouter, configura la variable: OPENROUTER_API_KEY');
  console.log('='.repeat(50));
});
EOF