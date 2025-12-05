import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes/v1/index.js';
import errorHandler from './middleware/errorHandler.js';
import './config/db.js';
import responseFormatter from './middleware/responseFormatter.js';


import './config/db.js';

const app = express();

// --- Middlewares Esenciales ---

// Habilita CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Accept',
    'x-api-key',
    'X-API-TOKEN',
    'Authorization'
  ],
  exposedHeaders: [
    'X-Total-Count'
  ],
  credentials: false
}));

app.use(express.json());
app.use(responseFormatter);

// Ruta de "salud" básica
app.get('/', (req, res) => {
  res.json({ message: 'API del Proyecto 2 (IC8057) está funcionando.' });
});

// Rutas API v1
app.use('/api/v1', router);


// --- Manejo de Errores ---
// Este middleware captura errores
app.use(errorHandler);
export default app;