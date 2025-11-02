import crypto from 'crypto';
import 'dotenv/config'; // Asegura que la clave esté cargada

const algorithm = 'aes-256-cbc'; // Algoritmo estándar
const secretKey = process.env.ENCRYPTION_KEY;

// Verifica que la clave exista y tenga el tamaño correcto
if (!secretKey || secretKey.length !== 64) {
  throw new Error('ENCRYPTION_KEY inválida o no definida en .env. Debe ser de 64 caracteres hexadecimales.');
}

const key = Buffer.from(secretKey, 'hex'); // Convierte la clave a 32 bytes

/**
 * Cifra un texto plano (ej: "1234").
 * @param {string} text - El texto a cifrar.
 * @returns {string} - El texto cifrado (IV + texto), ej: "iv_hex:encrypted_hex"
 */
export const encrypt = (text) => {
  // Genera un 'Initialization Vector' (IV) nuevo para cada cifrado. Es crucial.
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Devuelve el IV junto con el texto cifrado. Lo necesitarás para descifrar.
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Descifra un texto cifrado.
 * @param {string} encryptedText - El texto cifrado (formato "iv_hex:encrypted_hex").
 * @returns {string} - El texto plano original.
 */
export const decrypt = (encryptedText) => {
  try {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    if (!ivHex || !encryptedHex) {
      throw new Error('Formato de texto cifrado inválido.');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error al descifrar:', error);
    return null; // Devuelve null si el descifrado falla (ej: clave incorrecta)
  }
};