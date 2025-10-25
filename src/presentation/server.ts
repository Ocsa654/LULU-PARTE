import { App } from './app';

const PORT = parseInt(process.env.PORT || '3000');

const app = new App();
app.listen(PORT);

// Manejo de errores no capturados
process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
