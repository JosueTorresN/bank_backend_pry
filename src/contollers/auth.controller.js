import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import config from '../config/sentings.js';

// Importa el nuevo controlador de DB en lugar de 'readData'
import { findUserForLogin } from '../db.controllers/auth.db.controller.js';

const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    // 1. Llama al controlador de DB para buscar al usuario
    const user = await findUserForLogin(username);

    // 2. Valida si el usuario existe
    if (!user) {
      const error = new Error('Unauthorized: Invalid credentials');
      error.statusCode = 401;
      return next(error);
    }
    console.log('User found:', user);
    console.log('Provided password:', password);

    // 3. Valida la contraseña usando bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.contrasena_hash);
    console.log('Is password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      const error = new Error('Unauthorized: Invalid credentials');
      console.log('Password validation failed');
      error.statusCode = 401;
      return next(error);
    }
    console.log('Password is valid, generating token...', config.JWT_SECRET);
    // 4. Crea el token (usando los nombres de columna del SP)
    const tokenPayload = { id: user.user_id, role: user.rol };
    const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: '1h' });
    console.log('Generated token:', token);

    // Asumo que tienes un middleware 'res.success'
    res.success(200, { token }); 
    
  } catch (error) {
    // Si findUserForLogin falla, o cualquier otra cosa, 'next' lo captura
    next(error);
  }
};

export default { login };