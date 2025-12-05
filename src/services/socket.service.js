import { io } from 'socket.io-client';
import {
    reserveFundsInDb,
    registerIncomingPendingInDb,
    confirmDebitInDb,
    finalizeTransactionInDb,
    rollbackTransactionInDb
} from '../db.controllers/transfer.db.controller.js';


const CENTRAL_BANK_URL = 'http://137.184.36.3:6000';
const MY_BANK_ID = 'B05'; 
const MY_BANK_NAME = 'Bancrap';
const TOKEN = 'BANK-CENTRAL-IC8057-2025'; 

let socket;

export const initSocket = () => {
  if (socket) return; 
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

  socket.on('transfer.reserve', async (payload) => {
    console.log('📩 Evento Recibido: transfer.reserve', payload);
    const { id } = payload.data; 

    try {

      await reserveFundsInDb(id); 
      
      // Respuesta de éxito al Banco Central
      socket.emit('transfer.reserve.result', {
        type: 'transfer.reserve.result',
        data: { id, ok: true }
      });
    } catch (error) {
      console.error(`Error reservando fondos ${id}:`, error.message);
      // Respuesta de error (Fondos insuficientes, etc.)
      socket.emit('transfer.reserve.result', {
        type: 'transfer.reserve.result',
        data: { id, ok: false, reason: 'NO_FUNDS' }
      });
    }
  });

  socket.on('transfer.credit', async (payload) => {
    console.log('📩 Evento Recibido: transfer.credit', payload);
    const { id, to, amount, currency, from } = payload.data; 

    try {
      // Registramos la entrada pendiente
      await registerIncomingPendingInDb({ transactionId: id, toAccount: to, amount, currency, fromAccount: from });
      
      socket.emit('transfer.credit.result', {
        type: 'transfer.credit.result',
        data: { id, ok: true }
      });
    } catch (error) {
      console.error(`Error en credit ${id}:`, error.message);
      socket.emit('transfer.credit.result', {
        type: 'transfer.credit.result',
        data: { id, ok: false, reason: 'CREDIT_FAILED' }
      });
    }
  });

  socket.on('transfer.debit', async (payload) => {
    console.log('📩 Evento Recibido: transfer.debit', payload);
    const { id } = payload.data;

    try {
      await confirmDebitInDb(id);
      
      socket.emit('transfer.debit.result', {
        type: 'transfer.debit.result',
        data: { id, ok: true }
      });
    } catch (error) {
      console.error(`Error en debit ${id}:`, error.message);

      socket.emit('transfer.debit.result', {
        type: 'transfer.debit.result',
        data: { id, ok: false, reason: 'DEBIT_FAILED' }
      });
    }
  });


  socket.on('transfer.commit', async (payload) => {
    console.log('✅ COMMIT:', payload);
    try { await finalizeTransactionInDb(payload.data.id, 'COMMITTED'); } 
    catch(e) { console.error("Error en commit DB", e); }
  });

  socket.on('transfer.rollback', async (payload) => {
    console.log('⚠️ ROLLBACK:', payload);
    try { await rollbackTransactionInDb(payload.data.id); } 
    catch(e) { console.error("Error en rollback DB", e); }
  });

  socket.on('transfer.reject', async (payload) => {
     console.error('⛔ REJECT:', payload);
     try { await finalizeTransactionInDb(payload.data.id, 'REJECTED', payload.data.reason); } 
     catch(e) { console.error("Error en reject DB", e); }
  });
};

export const sendTransferIntent = (transferData) => {
  if (!socket) {
      console.error("⚠️ Socket no inicializado. Llamando a initSocket()...");
      initSocket(); // Intento de autorecuperación
  }
  
  const payload = {
    type: 'transfer.intent',
    data: {
      id: transferData.transactionId, 
      from: transferData.fromAccountId, 
      to: transferData.toAccountId,     
      amount: transferData.amount,
      currency: transferData.currency
    }
  };
  
  console.log('📤 Enviando Intent:', payload);
  socket.emit('transfer.intent', payload);
};