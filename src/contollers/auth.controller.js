import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import config from '../config/sentings.js';

// Importa el nuevo controlador de DB en lugar de 'readData'
import { findUserForLogin, createOtp } from '../db.controllers/auth.db.controller.js';

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

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    // 1. Buscamos al usuario para obtener su ID
    // Reutilizamos 'findUserForLogin' que busca por email o username
    const user = await findUserForLogin(email);

    // 2. IMPORTANTE: Seguridad
    // Si el email no existe, NO informamos al cliente.
    // Simplemente respondemos 200 OK para evitar que adivinen emails.
    if (!user) {
      console.log(`Intento de reseteo para email no registrado: ${email}`);
      return res.success(200, { 
        message: 'Si existe una cuenta con este email, se ha enviado un código de recuperación.' 
      });
    }

    // 3. Generar un OTP (código numérico)
    // Genera un número seguro de 6 dígitos (entre 100000 y 999999)
    const otp = crypto.randomInt(100000, 999999).toString();
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(otp, saltRounds);
    
    // 4. Definir parámetros del OTP
    const otpPurpose = 'password_reset'; // Debe ser un valor en tu ENUM 'proposito_otp'
    const expiresInSeconds = 300; // 5 minutos

    // 5. Guardar el HASH del OTP en la base de datos
    await createOtp(
      user.user_id,
      otpPurpose,
      expiresInSeconds,
      hashedOtp
    );

    // 6. [PENDIENTE] Enviar el OTP por email
    // Aquí deberías llamar a tu servicio de envío de correos
    // (Este código es solo un ejemplo, necesitarás un servicio real)
    console.log(`--- SIMULACIÓN DE EMAIL ---`);
    console.log(`Enviando OTP a: ${email}`);
    console.log(`Código (no hasheado): ${otp}`);
    console.log(`---------------------------`);
    // ej: await emailService.send(email, 'Tu código de recuperación', `Tu código es: ${otp}`);

    // 7. Enviar respuesta exitosa genérica
    res.success(200, { 
      message: 'Si existe una cuenta con este email, se ha enviado un código de recuperación.' 
    });
    
  } catch (error) {
    next(error); // Envía cualquier error a tu 'errorHandler'
  }
};

export default { login, forgotPassword };