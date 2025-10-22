require('dotenv').config(); // Carga las variables de .env al inicio
const express = require('express');
const cors = require('cors');

// Importa la conexión a la BD (esto ejecutará el pool.connect de db.js)
require('./config/db'); 

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares Esenciales ---

// Habilita CORS (Cross-Origin Resource Sharing)
app.use(cors()); 

// Middleware para parsear cuerpos de solicitud en formato JSON [cite: 71]
app.use(express.json()); 

// --- Rutas ---

// Ruta de "salud" básica
app.get('/', (req, res) => {
  res.json({ message: 'API del Proyecto 2 (IC8057) está funcionando.' });
});

// Router principal de la API v1
// Todas las rutas aquí tendrán el prefijo /api/v1 [cite: 53]
const apiV1Router = require('./routes/v1'); 
app.use('/api/v1', apiV1Router);

// --- Manejo de Errores (Básico) ---
// Este middleware captura errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Devuelve un error JSON estandarizado [cite: 73]
  res.status(500).json({ 
    message: 'Error interno del servidor.',
    // Solo muestra detalles del error en desarrollo
    error: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un problema.' 
  });
});

// --- Iniciar Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});