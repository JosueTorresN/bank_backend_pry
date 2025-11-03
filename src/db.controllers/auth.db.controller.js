import { callSP } from '../config/db.js';

/**
 * Busca un usuario por username o email para el proceso de login.
 * Asume que el SP devuelve el ID, rol y el hash de la contraseña.
 * @param {string} usernameOrEmail - El username o email del usuario.
 * @returns {Promise<object | null>} El objeto de usuario o null si no se encuentra.
 */
export const findUserForLogin = async (usernameOrEmail) => {
  try {
    // Llamamos al SP que debe devolver: user_id, rol, contrasena_hash
    const { rows } = await callSP(
      'sp_auth_user_get_by_username_or_email', 
      [usernameOrEmail]
    );

    // Si no devuelve filas, el usuario no existe
    if (rows.length === 0) {
      return null;
    }
    
    // Devuelve el primer (y único) usuario encontrado
    return rows[0]; 

  } catch (error) {
    console.error('Error al ejecutar findUserForLogin:', error);
    // Lanzamos el error para que el controlador de login lo maneje
    throw new Error('Error al buscar usuario en la base de datos.'); 
  }
};

// Esta función guarda el hash del OTP en la base de datos
export const createOtp = async (userId, purpose, expiresInSeconds, hashedCode) => {
  try {
    const { rows } = await callSP(
      'sp_otp_create',
      [userId, purpose, expiresInSeconds, hashedCode]
    );
    
    // El SP devuelve el ID del OTP creado
    return rows[0].sp_otp_create;

  } catch (error) {
    console.error('Error al ejecutar sp_otp_create:', error);
    // Lanza el error para que el controlador principal lo maneje
    throw new Error('Error al guardar el OTP en la base de datos.');
  }
};

export const consumeOtp = async (userId, purpose, hashedCode) => {
  try {
    const { rows } = await callSP(
      'sp_otp_consume',
      [userId, purpose, hashedCode]
    );

    // El SP devuelve un booleano (true si fue exitoso, false si no)
    return rows[0].sp_otp_consume;

  } catch (error) {
    console.error('Error al ejecutar sp_otp_consume:', error);
    throw new Error('Error al intentar consumir el OTP en la base de datos.');
  }
};