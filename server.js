// server.js - Versión optimizada para Railway
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Variables de entorno
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ===== RUTAS =====

// Health check para Railway
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'WhatsApp Bot Proxy Server',
    timestamp: new Date().toISOString(),
    openrouter: OPENROUTER_API_KEY ? 'configured' : 'not_configured',
    endpoints: {
      chat: 'POST /api/chat',
      health: 'GET /health'
    }
  });
});

// Health check específico
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Endpoint principal
app.post('/api/chat', async (req, res) => {
  console.log('📨 Request received at:', new Date().toISOString());
  
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message is required and must be a string'
    });
  }

  // Verificar API Key
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'OpenRouter API key not configured',
      setup: 'Add OPENROUTER_API_KEY in Railway variables'
    });
  }

  try {
    console.log(`🤖 Processing: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    const openrouterResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente útil para WhatsApp. Responde en español de manera clara y concisa. Usa emojis apropiados. Sé amigable.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://railway.app',
          'X-Title': 'WhatsApp Bot'
        },
        timeout: 25000
      }
    );

    const responseText = openrouterResponse.data.choices[0].message.content;
    
    console.log(`✅ Response generated (${responseText.length} chars)`);
    
    res.json({
      success: true,
      response: responseText,
      model: openrouterResponse.data.model,
      tokens: openrouterResponse.data.usage?.total_tokens
    });

  } catch (error) {
    console.error('❌ OpenRouter error:', error.message);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.response?.status === 401) {
      statusCode = 401;
      errorMessage = 'Invalid OpenRouter API key';
    } else if (error.response?.status === 429) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 502;
      errorMessage = 'Cannot connect to OpenRouter';
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = 504;
      errorMessage = 'OpenRouter timeout';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.response?.data || error.message
    });
  }
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📡 OpenRouter: ${OPENROUTER_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}/health`);
  console.log('='.repeat(50));
  
  if (!OPENROUTER_API_KEY) {
    console.log('⚠️  WARNING: OPENROUTER_API_KEY not set');
    console.log('   Add it in Railway → Variables');
  }
});