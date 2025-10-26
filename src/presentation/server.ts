import 'reflect-metadata'; // Requerido para TypeORM
import { App } from './app';
import { initializeDatabase } from '../infrastructure/database/database.config';

const PORT = parseInt(process.env.PORT || '3000');

/**
 * Iniciar servidor con conexión a base de datos
 */
async function startServer() {
  try {
    // 1. Intentar conectar a PostgreSQL
    console.log('🔌 Conectando a PostgreSQL...');
    try {
      await initializeDatabase();
      console.log('✅ PostgreSQL conectado - Modo completo activado');
    } catch (dbError: any) {
      console.warn('⚠️  PostgreSQL no disponible - Modo solo caché activado');
      console.warn('⚠️  Las retroalimentaciones NO se guardarán en BD permanente');
      console.warn('⚠️  Solución: Inicia PostgreSQL y reinicia el servidor');
      console.warn('');
    }

    // 2. Iniciar servidor Express (incluso sin BD)
    const app = new App();
    app.listen(PORT);

  } catch (error) {
    console.error('❌ Error crítico al iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

// Manejo de errores no capturados
process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
