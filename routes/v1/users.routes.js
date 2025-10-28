// users.routes.js (o un controlador asociado)

const express = require('express');
const router = express.Router();
const db = require('../../config/db'); // Asume que db.js está un nivel arriba
// const bcrypt = require('bcrypt'); // Necesitarás instalar e importar bcrypt

// Endpoint POST /api/v1/users
router.post('/', async (req, res, next) => {
    const { 
        tipo_identificacion, 
        identificacion, 
        nombre, 
        apellido, 
        correo, 
        telefono, 
        usuario, 
        password, // Contraseña en texto plano
        rol,
        fecha_nacimiento // Requerido para la validación del SP
    } = req.body;

    // 1. Lógica de Hashing (Simulado, ya que requiere instalar bcrypt)
    // const saltRounds = 10;
    // const contrasena_hash = await bcrypt.hash(password, saltRounds);
    const contrasena_hash = `HASH_SEGURO_${password}_${Date.now()}`; // **SIMULACIÓN**

    // 2. Definir el ID de rol por defecto (Cliente, si no se especifica)
    // Usamos el UUID insertado en el paso 1
    const cliente_rol_id = rol || '10000000-0000-0000-0000-000000000002'; 

    try {
        // Llama al SP con los 10 parámetros requeridos
        const { rows } = await db.callSP('sp_users_create', [
            tipo_identificacion,
            identificacion,
            nombre,
            apellido,
            correo,
            telefono,
            usuario,
            contrasena_hash,
            cliente_rol_id,
            fecha_nacimiento // El SP validará la edad
        ]);

        // El SP devuelve el ID del usuario creado
        const user_id = rows[0].sp_users_create; 
        
        // 3. Respuesta JSON estandarizada
        res.status(201).json({ 
            message: 'Usuario creado exitosamente.', 
            user_id: user_id 
        });

    } catch (error) {
        console.error('Error al crear usuario:', error.message);
        
        // Manejo de excepciones (ej: unicidad, edad, etc.) lanzadas por el SP
        // El formato de error es estandarizado
        res.status(400).json({ 
            message: 'Error en la solicitud.',
            error: error.message.includes('Identificación ya registrada') ? 'La identificación ya está en uso.' : 
                   error.message.includes('Edad') ? 'Debe tener al menos 18 años.' : 
                   'Error al procesar la creación de usuario. Verifique los datos.'
        });
    }
});

module.exports = router;