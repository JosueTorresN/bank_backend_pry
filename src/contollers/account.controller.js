import crypto from 'crypto';
import { createAccountInDb, getAccountsFromDb, setAccountStatusInDb, getAccountMovementsFromDb } from '../db.controllers/account.db.controller.js';


const ESTADO_CUENTA_ACTIVA_ID = '30000000-0000-0000-0000-000000000001';
const PAIS_CODIGO = 'CR';
const ID_INTERNO = '01'; // Requisito obligatorio según columna 2
const BANCO_CODIGO = 'B05'; // Asumiendo que 05 es tu ID de banco
const CLIENTE_ROL_ID = '10000000-0000-0000-0000-000000000002';
const ADMIN_ROL_ID = '10000000-0000-0000-0000-000000000001'

/**
 * Simula la generación de un IBAN.
 * En un sistema real, esto sería mucho más complejo y validado.
 */
const generateIban = () => {
  // Generar exactamente 12 dígitos numéricos
  let numeroCuenta = '';
  while (numeroCuenta.length < 12) {
    numeroCuenta += crypto.randomInt(0, 10).toString();
  }
  const checkDigits = '000'; 
  return `${PAIS_CODIGO}${checkDigits}${ID_INTERNO}${BANCO_CODIGO}${numeroCuenta}`;
};

/**
 * Controlador para crear una nueva cuenta bancaria.
 * Se encarga de la lógica de negocio y seguridad.
 */
const createAccount = async (req, res, next) => {
    //tipo de cuente: Ahorro -> 50000000-0000-0000-0000-000000000001
    // correiente: 50000000-0000-0000-0000-000000000002
    // tipo meneda: Colones -> 50000000-0000-0000-0000-000000000002
    // Dolares: 30000000-0000-0000-0000-000000000002
  try {
    // 1. Obtener datos del Body (lo que el usuario SÍ puede proveer)
    const { alias, tipo, moneda } = req.body;
    
    // 2. Obtener datos de Seguridad (del JWT)
    const loggedInUserId = req.user.id;

    // 3. Lógica de Negocio: Generar/Forzar valores
    const saldo_inicial = 0.00; // Un usuario no puede crear una cuenta con saldo
    const estado = ESTADO_CUENTA_ACTIVA_ID; // Las cuentas se crean "Activas"
    const iban = generateIban(); // El IBAN se genera en el servidor

    // 4. Validar que los UUIDs requeridos vengan
    if (!alias || !tipo || !moneda) {
      const error = new Error('Faltan campos requeridos: alias, tipo y moneda.');
      error.statusCode = 400;
      return next(error);
    }

    // 5. Ensamblar los datos para el SP
    const accountData = {
      usuario_id: loggedInUserId,
      iban,
      alias,
      tipo,     // UUID de tipo de cuenta
      moneda,   // UUID de moneda
      saldo_inicial,
      estado
    };
    
    // 6. Llamar al controlador de DB
    const newAccountId = await createAccountInDb(accountData);

    // 7. Enviar respuesta exitosa
    res.success(201, {
      message: 'Cuenta creada exitosamente.',
      accountId: newAccountId,
      iban: iban // Devuelve el IBAN generado para que el usuario lo vea
    });

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para obtener TODAS las cuentas de un usuario.
 * Se accede vía: GET /api/v1/accounts?ownerId=...
 * Aplica lógica de seguridad: "solo admin o cliente dueño".
 */
const getAccounts = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { ownerId } = req.query;        // ID del dueño (de la query string)
    const loggedInUser = req.user;        // Usuario logueado (del JWT)

    // let targetOwnerId = ownerId;
    let targetOwnerId = loggedInUser.id

    // 2. Lógica de Negocio y Seguridad
    const isAdmin = loggedInUser.role === ADMIN_ROL_ID;

    // Si NO se provee un ownerId...
    if (!targetOwnerId) {
      // Si es admin, es un error (debe especificar a quién ver).
      if (isAdmin) {
        const error = new Error('Los administradores deben especificar un "ownerId" en la query.');
        error.statusCode = 400; // 400 Bad Request
        return next(error);
      }
      // Si es un usuario normal, se asume que quiere ver sus propias cuentas.
      targetOwnerId = loggedInUser.id;
    } 
    // Si SÍ se provee un ownerId, validamos el permiso
    else if (!isAdmin && loggedInUser.id !== targetOwnerId) {
      // No es admin y está intentando ver las cuentas de OTRA PERSONA.
      const error = new Error('Acceso denegado. No tienes permiso para ver este recurso.');
      error.statusCode = 403; // 403 Forbidden
      return next(error);
    }
    
    // 3. Llamar a la capa de base de datos
    // Pasamos el targetOwnerId y 'null' para accountId para que traiga todas.
    const accounts = await getAccountsFromDb(targetOwnerId, null);

    // 4. Enviar respuesta exitosa
    // El SP devuelve un array. Si no tiene cuentas, será un array vacío [].
    res.success(200, accounts);

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para obtener una cuenta por su ID.
 * Aplica la lógica de "solo admin o cliente dueño".
 */
const getAccountById = async (req, res, next) => {

  try {
    // 1. Obtener datos de la solicitud
    const { id: accountId } = req.params;     // ID de la cuenta (de la URL)
    const loggedInUser = req.user;            // Usuario logueado (del JWT)

    // 2. Lógica de Autorización: "solo admin o cliente dueño"
    const isAdmin = loggedInUser.role === ADMIN_ROL_ID;
    
    // Si es admin, pasamos ownerId = null (para que el SP no filtre por dueño).
    // Si NO es admin, pasamos el loggedInUser.id (para que el SP verifique que es el dueño).
    // const ownerId = isAdmin ? null : loggedInUser.id;
    const ownerId = loggedInUser.id;

    // 3. Llamar a la capa de base de datos
    const accounts = await getAccountsFromDb(ownerId, accountId);

    // 4. Manejar "No Encontrado"
    // Si el array está vacío, significa que:
    // a) La cuenta no existe (404).
    // b) La cuenta existe, pero no pertenece a este usuario (404/403).
    // En ambos casos, 404.
    if (accounts.length === 0) {
      const error = new Error('Cuenta no encontrada o no tienes permiso para verla.');
      error.statusCode = 404;
      return next(error);
    }

    // 5. Enviar respuesta exitosa
    // El SP devuelve un array, pero solo queremos el primer (y único) elemento.
    res.success(200, accounts[0]);

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para cambiar el estado de una cuenta.
 * Lógica de negocio: SOLO ADMIN.
 */
const setAccountStatus = async (req, res, next) => {
    //30000000-0000-0000-0000-000000000001 activa
    //30000000-0000-0000-0000-000000000002 bloqueda
    //30000000-0000-0000-0000-000000000003 cerrada
        console.log('Perro hpt')
  try {
    // 1. Obtener datos
    // La ruta es /:accountId/status
    const { accountId } = req.params;     
    const { newStatusId } = req.body; // El UUID del nuevo estado viene en el body
    const loggedInUser = req.user;    // Usuario logueado (del JWT)
    console.log("Paso aqui 1")
    // 2. Lógica de Autorización: "solo admin"
    const isAdmin = loggedInUser.role === ADMIN_ROL_ID;

    if (!isAdmin) {
      const error = new Error('Acceso denegado. Solo los administradores pueden cambiar el estado de una cuenta.');
      error.statusCode = 403; // 403 Forbidden
      return next(error);
    }
    
    // 3. Validación de entrada
    if (!newStatusId) {
        const error = new Error('El campo "newStatusId" es requerido.');
        error.statusCode = 400; // 400 Bad Request
        return next(error);
    }

    // 4. Llamar a la capa de base de datos
    const success = await setAccountStatusInDb(accountId, newStatusId);

    // 5. Manejar respuesta
    // Si el SP devuelve 'false' (o lanza "Cuenta no encontrada")
    if (!success) {
      const error = new Error('Cuenta no encontrada.');
      error.statusCode = 404;
      return next(error);
    }

    res.success(200, { message: 'Estado de la cuenta actualizado exitosamente.' });

  } catch (error) {
    // 6. Manejar errores de lógica de negocio del SP
    if (error.message.includes('saldo distinto de cero')) {
      error.statusCode = 409; // 409 Conflict (El estado no permite la acción)
    }
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para obtener los movimientos de una cuenta.
 * Aplica lógica de "solo admin o cliente dueño" y maneja filtros/paginación.
 */
const getAccountMovements = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { accountId } = req.params;     // ID de la cuenta (de la URL)
    const loggedInUser = req.user;        // Usuario logueado (del JWT)

    // 2. Lógica de Autorización: "solo admin o cliente dueño"
    // Reutilizamos la lógica de getAccountById para validar permisos.
    const isAdmin = loggedInUser.role === ADMIN_ROL_ID;
    const ownerId = isAdmin ? null : loggedInUser.id;
    
    // Verificamos si la cuenta existe Y si el usuario tiene permiso para verla
    const authorizedAccounts = await getAccountsFromDb(ownerId, accountId);
    
    if (authorizedAccounts.length === 0) {
      const error = new Error('Cuenta no encontrada o no tienes permiso para verla.');
      error.statusCode = 404;
      return next(error);
    }

    // 3. Parsear Filtros y Paginación de la Query String
    const { fromDate, toDate, type, q } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '10', 10);

    // 4. Llamar a la capa de base de datos
    const rows = await getAccountMovementsFromDb(accountId, {
      fromDate, toDate, type, q, page, pageSize
    });

    // 5. Formatear Respuesta de Paginación
    // Si no hay resultados, 'rows' será un array vacío
    if (rows.length === 0) {
      return res.success(200, {
        pagination: { totalItems: 0, totalPages: 0, currentPage: page, pageSize },
        data: []
      });
    }

    // El SP nos da 'total_rows' en CADA fila. Lo tomamos de la primera.
    const totalItems = parseInt(rows[0].total_rows, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    // Limpiamos la columna 'total_rows' de los datos que enviamos al cliente
    const data = rows.map(r => {
      delete r.total_rows;
      return r;
    });

    // 6. Enviar respuesta exitosa
    res.success(200, {
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize
      },
      data
    });

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

export default {
  createAccount,
  getAccountById,
  getAccounts,
  setAccountStatus,
  getAccountMovements
};