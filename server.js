import app from './src/app.js';
import sentings from './src/config/sentings.js';
import { initSocket } from './src/services/socket.service.js';

const PORT = sentings.appPort || 3001;

// --- Iniciar Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  initSocket();
});