import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import config from '../config/sentings.js';

// Importa el nuevo controlador de DB en lugar de 'readData'
import { findUserForLogin, createOtp, consumeOtp } from '../db.controllers/auth.db.controller.js';

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
    console.log("Rol: ", user.rol)
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

// En: src/controllers/auth.controller.js

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await findUserForLogin(email);

    if (!user) {
      console.log(`Intento de reseteo para email no registrado: ${email}`);
      return res.success(200, { 
        message: 'Si existe una cuenta con este email, se ha enviado un código de recuperación.' 
      });
    }

    // 3. Generar un OTP (código numérico)
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // 4. Hashear con SHA256 (¡ESTE ES EL CAMBIO!)
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    
    // 5. Definir parámetros del OTP
    const otpPurpose = 'password_reset';
    const expiresInSeconds = 300; // 5 minutos

    // 6. Guardar el HASH del OTP en la base de datos
    await createOtp(
      user.user_id,
      otpPurpose,
      expiresInSeconds,
      hashedOtp // Se guarda el hash SHA256
    );

    // 7. [PENDIENTE] Enviar el OTP por email
    console.log(`--- SIMULACIÓN DE EMAIL ---`);
    console.log(`Enviando OTP a: ${email}`);
    console.log(`Código (no hasheado): ${otp}`);
    console.log(`---------------------------`);
    
    res.success(200, { 
      message: 'Si existe una cuenta con este email, se ha enviado un código de recuperación.' 
    });
    
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  // Asumo que el body enviará el email, el OTP (texto plano) y el propósito
  const { email, otp, purpose } = req.body;

  try {
    // 1. Validar que el usuario exista
    const user = await findUserForLogin(email);
    if (!user) {
      const error = new Error('OTP no válido o expirado.');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Hashear el OTP (con SHA256 para que coincida con el SP)
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // 3. Intentar consumir el OTP
    const isSuccess = await consumeOtp(
      user.user_id,
      purpose, // Ej: 'recuperacion'
      hashedOtp
    );

    // 4. Verificar el resultado
    if (!isSuccess) {
      // El SP devolvió 'false' (OTP incorrecto, expirado o ya usado)
      const error = new Error('OTP no válido o expirado.');
      error.statusCode = 400;
      return next(error);
    }

    // 5. Éxito
    res.success(200, {
      message: 'OTP verificado exitosamente.'
    });

  } catch (error) {
    next(error);
  }
};

export default { login, forgotPassword, verifyOtp };