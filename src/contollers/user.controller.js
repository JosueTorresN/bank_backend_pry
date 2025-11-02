import bcrypt from 'bcrypt';
import { createUserInDb, getUserByIdentificationDb, updateUserInDb, deleteUserInDb } from '../db.controllers/user.db.controller.js';

const CLIENTE_ROL_ID = '10000000-0000-0000-0000-000000000002';
const ADMIN_ROL_ID = '10000000-0000-0000-0000-000000000001'
const SALT_ROUNDS = 10;

/**
 * Controlador para manejar la creación de un nuevo usuario.
 * Se encarga de hashear la contraseña y llamar al controlador de DB.
 */
const createUser = async (req, res, next) => {
  const { 
    tipo_identificacion, 
    identificacion, 
    nombre, 
    apellido, 
    correo, 
    telefono, 
    usuario, 
    password, // Recibe la contraseña en texto plano
    rol, 
    fecha_nacimiento 
  } = req.body;

  try {
    // 1. Lógica de Negocio: Hashear la contraseña
    const contrasena_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 2. Lógica de Negocio: Definir el rol
    // Si no se especifica un rol, se asigna el de Cliente por defecto.
    const userRole = rol || CLIENTE_ROL_ID;

    // 3. Preparar los datos para el SP
    const userData = {
      tipo_identificacion,
      identificacion,
      nombre,
      apellido,
      correo,
      telefono,
      usuario,
      contrasena_hash, // Envía el hash
      rol: userRole,   // Envía el rol definido
      fecha_nacimiento
    };

    // 4. Llamar al controlador de DB
    const newUserId = await createUserInDb(userData);

    // 5. Enviar respuesta exitosa
    res.success(201, {
      message: 'Usuario creado exitosamente.',
      userId: newUserId
    });

  } catch (error) {
    // 6. Manejar errores conocidos del SP (Errores 4xx)
    if (error.message.includes('registrada') || error.message.includes('en uso')) {
      error.statusCode = 409; // 409 Conflict (recurso ya existe)
    } else if (error.message.includes('edad')) {
      error.statusCode = 400; // 400 Bad Request (datos inválidos)
    }
    
    // Pasa el error (con el nuevo statusCode) al errorHandler
    next(error); 
  }
};

/**
 * Controlador para obtener un usuario por su identificación.
 * Aplica lógica de seguridad: solo admin o el propio usuario pueden ver los datos.
 */
const getUserByIdentification = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { identificacion } = req.params; // De la URL /users/:identificacion
    const loggedInUser = req.user;         // Del middleware de autenticación (JWT)

    // 2. Llamar a la capa de base de datos
    const targetUser = await getUserByIdentificationDb(identificacion);
    console.log("tergetUser", targetUser)
    // 3. Manejar "No Encontrado"
    if (!targetUser) {
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      return next(error);
    }

    // 4. Lógica de Negocio: Autorización
    // "solo admin o cliente dueño"
    const isAdmin = loggedInUser.role === ADMIN_ROL_ID;
    const isOwner = loggedInUser.id === targetUser.id; // Compara ID de logueado vs ID del recurso

    if (!isAdmin && !isOwner) {
      const error = new Error('Acceso denegado. No tienes permiso para ver este recurso.');
      error.statusCode = 403; // 403 Forbidden
      return next(error);
    }

    // 5. Enviar respuesta exitosa
    res.success(200, targetUser);

  } catch (error) {
    // Pasa cualquier error (ej: de la DB) al errorHandler
    next(error); 
  }
};

/**
 * Controlador para actualizar parcialmente un usuario.
 * Aplica lógica de seguridad:
 * 1. Solo admin o el propio usuario pueden actualizar.
 * 2. Solo admin puede cambiar el rol.
 */
const updateUser = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { id: targetUserId } = req.params; // ID del usuario a modificar (de la URL)
    const loggedInUser = req.user;          // Usuario logueado (del JWT)
    const updateData = req.body;            // Campos a actualizar (del JSON)

    // 2. Lógica de Autorización: "solo admin o cliente dueño"
    const isAdmin = loggedInUser.role === ADMIN_ROL_ID;
    const isOwner = loggedInUser.id === targetUserId;

    if (!isAdmin && !isOwner) {
      const error = new Error('Acceso denegado. No tienes permiso para modificar este recurso.');
      error.statusCode = 403; // 403 Forbidden
      return next(error);
    }

    // 3. Lógica de Negocio: Seguridad de Roles
    // Si el que hace la petición NO es admin, borramos el campo 'rol' del body.
    // Esto evita que un usuario normal se "promocione" a sí mismo a admin.
    if (!isAdmin) {
      delete updateData.rol;
    }

    // 4. Llamar a la capa de base de datos
    // Pasamos solo los campos que el SP espera
    const cleanUpdateData = {
      nombre: updateData.nombre,
      apellido: updateData.apellido,
      correo: updateData.correo,
      usuario: updateData.usuario,
      rol: updateData.rol
    };
    
    const success = await updateUserInDb(targetUserId, cleanUpdateData);

    // 5. Manejar respuesta
    if (!success) {
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      return next(error);
    }

    res.success(200, { message: 'Usuario actualizado exitosamente.' });

  } catch (error) {
    // 6. Manejar errores de unicidad del SP
    if (error.message.includes('en uso')) {
      error.statusCode = 409; // 409 Conflict
    }
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para eliminar un usuario.
 * Aplica lógica de seguridad: solo un admin puede eliminar usuarios.
 */
const deleteUser = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { id: targetUserId } = req.params; // ID del usuario a eliminar (de la URL)
    const loggedInUser = req.user;          // Usuario logueado (del JWT)

    // 2. Lógica de Autorización: "solo admin"
    const isAdmin = loggedInUser.role === ADMIN_ROL_ID;

    if (!isAdmin) {
      const error = new Error('Acceso denegado. Solo los administradores pueden eliminar usuarios.');
      error.statusCode = 403; // 403 Forbidden
      return next(error);
    }
    
    // 3. Opcional: Evitar que un admin se elimine a sí mismo
    // if (loggedInUser.id === targetUserId) {
    //   const error = new Error('Un administrador no puede eliminarse a sí mismo.');
    //   error.statusCode = 400; // 400 Bad Request
    //   return next(error);
    // }

    // 4. Llamar a la capa de base de datos
    const success = await deleteUserInDb(targetUserId);

    // 5. Manejar respuesta
    if (!success) {
      // El SP devolvió 'false' (WHERE id = p_user_id no encontró al usuario)
      const error = new Error('Usuario no encontrado.');
      error.statusCode = 404;
      return next(error);
    }

    res.success(200, { message: 'Usuario eliminado exitosamente.' });

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

export default {
  createUser,
  getUserByIdentification,
  updateUser,
  deleteUser
};