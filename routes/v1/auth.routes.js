// /auth.routes.js

const express = require('express');
const router = express.Router(); // Necesitas definir el router aquí
const db = require('../../config/db.js');

// Función que maneja la lógica de login
async function handleLogin(req, res) {
    const { username, password } = req.body;
    const usernameOrEmail = username;

    try {
        // Llama al SP. Nota: El SP fue definido para devolver user_id, contrasena_hash, y rol
        const { rows } = await db.callSP(
            'sp_auth_user_get_by_username_or_email', 
            [usernameOrEmail]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' }); // Mensaje genérico por seguridad
        }
        
        const user = rows[0]; 
        
        // CORRECCIÓN CLAVE: Obtener el hash para la verificación
        const contrasenaHash = user.contrasena_hash; 
        
        // [PENDIENTE] const isPasswordValid = await bcrypt.compare(password, contrasenaHash);

        // if (!isPasswordValid) {
        //    return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        // }
        
        // Si la verificación pasa: Generar JWT, etc.
        // ... (lógica de generación de JWT y respuesta)

        res.status(200).json({ 
            message: 'Login exitoso', 
            user_id: user.user_id, 
            rol: user.rol 
        });
        
    } catch (error) {
        console.error('Error al ejecutar sp_auth_user_get_by_username_or_email:', error);
        // Manejo de error estandarizado 
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
}

// Monta el handler en la ruta /login
router.post('/login', handleLogin);

module.exports = router;