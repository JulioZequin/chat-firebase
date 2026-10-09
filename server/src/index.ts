import express from 'express';
import { loadConfig } from './config.js';
import { createApp } from './createApp.js';
import { configureCloudinary } from './services/cloudinary.js';
import { initFirebase } from './services/firebaseAdmin.js';
import { configureExpo } from './services/notificationSender.js';

/**
 * Ponto de entrada da API.
 * Na Vercel (Express zero-config), o app exportado por padrão vira uma Vercel Function
 * com HTTPS público. Localmente, `src/local.ts` importa este app e chama listen().
 */
const config = loadConfig();
initFirebase(config);
configureExpo(config.expoAccessToken);
configureCloudinary(config.cloudinary);

const app = createApp(express());

export default app;
export { config };
