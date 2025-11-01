import { callSP } from '../config/db.js'; // Asegúrate que la ruta a tu config de DB sea correcta

/**
 * Busca un usuario por username o email para el proceso de login.
 * Asume que el SP devuelve el ID, rol y el hash de la contraseña.
 * @param {string} usernameOrEmail - El username o email del usuario.
 * @returns {Promise<object | null>} El objeto de usuario o null si no se encuentra.
 */
const findUserForLogin = async (usernameOrEmail) => {
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

export { findUserForLogin };