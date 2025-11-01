import 'dotenv/config'; // Sintaxis recomendada para dotenv
import express from 'express';
import cors from 'cors';
import router from './routes/v1/index.js'; // Asegúrate de que v1 exporte con 'export default'
import errorHandler from './middleware/errorHandler.js';
import './config/db.js'; // Importa el archivo para que se ejecute
import responseFormatter from './middleware/responseFormatter.js';

// Importa la conexión a la BD
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
    'Authorization'
  ],
  exposedHeaders: [
    // Para que el frontend pueda leer este header con fetch
    'X-Total-Count'
  ],
  credentials: false // ponlo true solo si vas a usar cookies/autenticación de origen cruzado
}));

app.use(express.json());
app.use(responseFormatter); // Middleware para formatear respuestas

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