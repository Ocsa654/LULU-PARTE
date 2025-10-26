import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración de TypeORM para conectarse a la base de datos de SAM
 * Usa las mismas credenciales y base de datos que el proyecto principal
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres', // ✅ Usar DB_USER para coincidir con SAM
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_NAME || 'asistente_programacion',
  synchronize: false, // ⚠️ IMPORTANTE: false para no alterar tablas de SAM
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/infrastructure/database/models/**/*.ts'],
  migrations: [],
  subscribers: [],
});

/**
 * Inicializar conexión a la base de datos
 */
export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    await AppDataSource.initialize();
    console.log('✅ [Database] Conexión a PostgreSQL establecida correctamente');
    return AppDataSource;
  } catch (error) {
    console.error('❌ [Database] Error al conectar a PostgreSQL:', error);
    throw error;
  }
};

/**
 * Cerrar conexión a la base de datos
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ [Database] Conexión cerrada correctamente');
    }
  } catch (error) {
    console.error('❌ [Database] Error al cerrar conexión:', error);
    throw error;
  }
};
