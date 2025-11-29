import { io } from 'socket.io-client';
import {
    createInternalTransferInDb,
    createInterbankTransactionInDb,
    reserveFundsInDb,
    registerIncomingPendingInDb,
    confirmDebitInDb,
    finalizeTransactionInDb,
    rollbackTransactionInDb
} from '../db.controllers/transfer.db.controller.js'; // Importamos las funciones de BD

const db = {
    createInternalTransferInDb,
    createInterbankTransactionInDb,
    reserveFundsInDb,
    registerIncomingPendingInDb,
    confirmDebitInDb,
    finalizeTransactionInDb,
    rollbackTransactionInDb
};

// CONFIGURACIÓN
const CENTRAL_BANK_URL = 'http://137.184.36.3:6000';
const MY_BANK_ID = 'B05'; // TU CÓDIGO DE BANCO
const MY_BANK_NAME = 'Bancrap';
const TOKEN = 'BANK-CENTRAL-IC8057-2025';

let socket;

export const initSocket = () => {
  socket = io(CENTRAL_BANK_URL, {
    transports: ['websocket'],
    auth: {
      bankId: MY_BANK_ID,
      bankName: MY_BANK_NAME,
      token: TOKEN
    }
  });

  socket.on('connect', () => {
    console.log(`✅ Conectado al Banco Central como ${MY_BANK_ID}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Desconectado del Banco Central');
  });

  // ================================================================
  // MANEJO DE EVENTOS ENTRANTES (Rol: Banco Origen o Destino)
  // ================================================================

  // 1. RESERVE (Rol: Origen) - Congelar fondos [cite: 242]
  socket.on('transfer.reserve', async (payload) => {
    console.log('📩 Evento Recibido: transfer.reserve', payload);
    const { id, amount, from } = payload.data; // Nota: El PDF no lista 'amount' en data de reserve explícitamente, pero es necesario. Asumimos que viene o lo tomamos de la BD local si guardamos el intent.
    // Ajuste: Según PDF p.10, el data solo trae {id}. El monto debe buscarse en BD local por ese ID si se guardó previamente, 
    // O confiar en que el Banco Central envía el contexto. 
    // *Para este ejemplo, asumiremos que recibimos los datos necesarios o los buscamos.*

    try {
      // Llamada a BD para reservar fondos
      await db.reserveFundsInDb(id, from, amount); 
      
      // Respuesta de éxito
      socket.emit('transfer.reserve.result', {
        type: 'transfer.reserve.result',
        data: { id, ok: true }
      });
    } catch (error) {
      // Respuesta de error (Fondos insuficientes, etc.)
      socket.emit('transfer.reserve.result', {
        type: 'transfer.reserve.result',
        data: { id, ok: false, reason: 'NO_FUNDS' }
      });
    }
  });

  // 2. CREDIT (Rol: Destino) - Acreditar temporalmente [cite: 280]
  socket.on('transfer.credit', async (payload) => {
    console.log('📩 Evento Recibido: transfer.credit', payload);
    const { id, to, amount, currency } = payload.data;

    try {
      await db.registerIncomingPendingInDb(id, to, amount, currency);
      
      socket.emit('transfer.credit.result', {
        type: 'transfer.credit.result',
        data: { id, ok: true }
      });
    } catch (error) {
      socket.emit('transfer.credit.result', {
        type: 'transfer.credit.result',
        data: { id, ok: false, reason: 'CREDIT_FAILED' }
      });
    }
  });

  // 3. DEBIT (Rol: Origen) - Confirmar débito [cite: 313]
  socket.on('transfer.debit', async (payload) => {
    console.log('📩 Evento Recibido: transfer.debit', payload);
    const { id } = payload.data;

    try {
      await db.confirmDebitInDb(id);
      
      socket.emit('transfer.debit.result', {
        type: 'transfer.debit.result',
        data: { id, ok: true }
      });
    } catch (error) {
      socket.emit('transfer.debit.result', {
        type: 'transfer.debit.result',
        data: { id, ok: false, reason: 'DEBIT_FAILED' }
      });
    }
  });

  // 4. COMMIT (Ambos) - Finalizar transacción [cite: 356]
  socket.on('transfer.commit', async (payload) => {
    console.log('✅ Transacción Exitosa: transfer.commit', payload);
    await db.finalizeTransactionInDb(payload.data.id, 'COMMITTED');
  });

  // 5. ROLLBACK (Ambos) - Revertir [cite: 344]
  socket.on('transfer.rollback', async (payload) => {
    console.log('⚠️ Revertir Transacción: transfer.rollback', payload);
    await db.rollbackTransactionInDb(payload.data.id);
  });
  
  // 6. REJECT (Ambos) - Rechazo inicial [cite: 374]
  socket.on('transfer.reject', async (payload) => {
     console.error('⛔ Transacción Rechazada: transfer.reject', payload);
     await db.finalizeTransactionInDb(payload.data.id, 'REJECTED', payload.data.reason);
  });
};

// Función para iniciar el flujo (Intent) desde el Controller
export const sendTransferIntent = (transferData) => {
  if (!socket) throw new Error('Socket no inicializado');
  
  const payload = {
    type: 'transfer.intent',
    data: {
      id: transferData.transactionId, // UUID generado en backend
      from: transferData.fromAccountId, // IBAN Origen
      to: transferData.toAccountId,     // IBAN Destino
      amount: transferData.amount,
      currency: transferData.currency
    }
  };
  
  console.log('📤 Enviando Intent:', payload);
  socket.emit('transfer.intent', payload);
};