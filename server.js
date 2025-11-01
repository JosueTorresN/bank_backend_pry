import app from './src/app.js';
import sentings from './src/config/sentings.js';

const PORT = sentings.appPort || 3001;

// --- Iniciar Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});