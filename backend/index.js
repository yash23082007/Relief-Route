require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const cron = require('node-cron');

const db = require('./config/db');
const convoyController = require('./controllers/convoyController');
const hazardController = require('./controllers/hazardController');
const authController = require('./controllers/authController');
const { fetchAndIngestHazards } = require('./services/nasaService');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Express API Routes
// Convoy Routes
app.get('/api/convoys', convoyController.getConvoys);
app.post('/api/convoys', convoyController.createConvoy);
app.patch('/api/convoys', convoyController.patchConvoyQuery);
app.put('/api/convoys/:id', convoyController.updateConvoy);
app.delete('/api/convoys/:id', convoyController.deleteConvoy);
app.post('/api/convoys/reset', convoyController.resetConvoys);

// Hazard/Incident Routes
app.get('/api/hazards', hazardController.getHazards);
app.post('/api/hazards', hazardController.createHazard);
app.post('/api/hazards/upsert', hazardController.upsertHazard);
app.post('/api/hazards/ingest', hazardController.triggerIngest);
app.post('/api/hazards/clear', hazardController.clearHazards);

// Mock Auth Routes
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);

// Basic health check
app.get('/', (req, res) => {
  res.json({ message: "ReliefRoute Backend API running successfully.", time: new Date() });
});

// Create HTTP server for Express and WebSockets
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocket.Server({ server });

// Keep track of connected WS clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('WebSocket Client Connected (total: ' + (clients.size + 1) + ')');
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket Client Disconnected (total: ' + clients.size + ')');
  });

  // Welcome message or ping/pong support
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to ReliefRoute Real-Time stream' }));
});

// Attach database change listener to broadcast changes to WebSocket clients
db.setDBChangeListener((changePayload) => {
  const message = JSON.stringify(changePayload);
  console.log(`WS Broadcast [${changePayload.table} - ${changePayload.event}]`);
  
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

// Schedule NASA EONET Ingestion Job - runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('⏰ Cron Triggered: NASA EONET Ingestion');
  await fetchAndIngestHazards();
});

// Bootstrap Database & Ingest NASA Hazards on startup
server.listen(PORT, async () => {
  console.log(`🚀 ReliefRoute Backend Server running on http://localhost:${PORT}`);
  
  // Trigger initial ingestion after a short delay to allow server initialization
  setTimeout(async () => {
    try {
      console.log('Initial startup: Fetching NASA hazards...');
      await fetchAndIngestHazards();
    } catch (err) {
      console.error('Failed to run initial NASA EONET Ingestion:', err.message);
    }
  }, 2000);
});
