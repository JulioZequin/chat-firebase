import app, { config } from './index.js';

// Execução local (desenvolvimento): `npm run dev`. Na Vercel este arquivo não é usado.
app.listen(config.port, () => {
  console.log(`[api] ChatFire API ouvindo em http://localhost:${config.port}`);
});
