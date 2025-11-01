import { callSP } from '../config/db.js'; // Asegúrate que la ruta a tu config de DB sea correcta

/**
 * Llama al SP para crear un nuevo usuario en la base de datos.
 * Recibe un objeto con todos los datos requeridos por el SP.
 * @param {object} userData - Objeto con los 10 parámetros del SP.
 * @returns {Promise<string>} El UUID del nuevo usuario.
 */
export const createUserInDb = async (userData) => {
  // El orden de este array DEBE coincidir con el orden de los argumentos del SP
  const params = [
    userData.tipo_identificacion,
    userData.identificacion,
    userData.nombre,
    userData.apellido,
    userData.correo,
    userData.telefono,
    userData.usuario,
    userData.contrasena_hash, // El hash ya viene calculado desde el controller
    userData.rol,
    userData.fecha_nacimiento
  ];

  try {
    const { rows } = await callSP('sp_users_create', params);
    // Devuelve el UUID del usuario creado
    return rows[0].sp_users_create;

  } catch (error) {
    // Si el SP lanza un RAISE EXCEPTION (ej: "Correo ya registrado"),
    // el error será capturado aquí. Lo relanzamos para que
    // el controlador principal lo maneje y envíe un 4xx.
    console.error('Error en sp_users_create:', error.message);
    throw error;
  }
};

/**
 * Llama al SP para obtener un usuario por su número de identificación.
 * @param {string} identificacion - El número de identificación a buscar.
 * @returns {Promise<object | null>} El objeto de usuario o null si no se encuentra.
 */
export const getUserByIdentificationDb = async (identificacion) => {
  try {
    const { rows } = await callSP(
      'sp_users_get_by_identification', 
      [identificacion]
    );

    if (rows.length === 0) {
      return null; // No se encontró el usuario
    }
    
    // Devuelve el primer (y único) usuario encontrado
    return rows[0]; 

  } catch (error) {
    console.error('Error en sp_users_get_by_identification:', error.message);
    // Lanza el error para que el controlador principal lo maneje
    throw error;
  }
};