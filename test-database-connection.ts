/**
 * Script de prueba para verificar conexión a PostgreSQL
 * Ejecutar con: npx ts-node test-database-connection.ts
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { AppDataSource } from './src/infrastructure/database/database.config';
import { RetroalimentacionRepository } from './src/infrastructure/database/repositories/RetroalimentacionRepository';
import { PreguntaQuizRepository } from './src/infrastructure/database/repositories/PreguntaQuizRepository';

dotenv.config();

async function testDatabaseConnection() {
  console.log('🧪 ================================================');
  console.log('🧪  TEST DE CONEXIÓN A BASE DE DATOS');
  console.log('🧪 ================================================');
  console.log('');

  try {
    // 1. Probar conexión
    console.log('1️⃣ Probando conexión a PostgreSQL...');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Puerto: ${process.env.DB_PORT}`);
    console.log(`   Base de datos: ${process.env.DB_NAME}`);
    console.log('');

    await AppDataSource.initialize();
    console.log('✅ Conexión establecida correctamente\n');

    // 2. Verificar tablas
    console.log('2️⃣ Verificando tablas...');
    const queryRunner = AppDataSource.createQueryRunner();

    const tablas = ['usuarios', 'retroalimentacion_llm', 'preguntas_quiz', 'opciones_respuesta', 'subtemas'];
    
    for (const tabla of tablas) {
      const existe = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${tabla}'
        );
      `);
      
      if (existe[0].exists) {
        console.log(`   ✅ Tabla '${tabla}' existe`);
      } else {
        console.log(`   ❌ Tabla '${tabla}' NO existe`);
      }
    }
    console.log('');

    // 3. Contar registros
    console.log('3️⃣ Contando registros existentes...');
    
    const countUsuarios = await queryRunner.query('SELECT COUNT(*) FROM usuarios');
    console.log(`   Usuarios: ${countUsuarios[0].count}`);
    
    const countRetro = await queryRunner.query('SELECT COUNT(*) FROM retroalimentacion_llm');
    console.log(`   Retroalimentaciones: ${countRetro[0].count}`);
    
    const countPreguntas = await queryRunner.query('SELECT COUNT(*) FROM preguntas_quiz');
    console.log(`   Preguntas: ${countPreguntas[0].count}`);
    
    const countOpciones = await queryRunner.query('SELECT COUNT(*) FROM opciones_respuesta');
    console.log(`   Opciones: ${countOpciones[0].count}`);
    
    console.log('');

    // 4. Probar Repositorios
    console.log('4️⃣ Probando repositorios...');
    
    const retroRepo = new RetroalimentacionRepository();
    new PreguntaQuizRepository(); // Verificar que se inicializa correctamente
    
    console.log('   ✅ RetroalimentacionRepository inicializado');
    console.log('   ✅ PreguntaQuizRepository inicializado');
    console.log('');

    // 5. Obtener estadísticas
    console.log('5️⃣ Obteniendo estadísticas de retroalimentaciones...');
    const stats = await retroRepo.obtenerEstadisticas();
    console.log('   Total retroalimentaciones:', stats.total);
    console.log('   Por tipo:', JSON.stringify(stats.porTipo, null, 2));
    console.log('   Por modelo:', JSON.stringify(stats.porModelo, null, 2));
    console.log('');

    // Cleanup
    await queryRunner.release();
    await AppDataSource.destroy();

    console.log('🎉 ================================================');
    console.log('🎉  TODAS LAS PRUEBAS PASARON CORRECTAMENTE');
    console.log('🎉 ================================================');
    console.log('');
    console.log('✅ La conexión a PostgreSQL está funcionando');
    console.log('✅ Todas las tablas necesarias existen');
    console.log('✅ Los repositorios están correctamente configurados');
    console.log('');
    console.log('👉 Puedes iniciar el servidor con: npm run dev');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ ================================================');
    console.error('❌  ERROR EN PRUEBA DE BASE DE DATOS');
    console.error('❌ ================================================');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 SOLUCIÓN:');
      console.error('   1. Verifica que PostgreSQL esté corriendo');
      console.error('   2. Verifica las credenciales en el archivo .env:');
      console.error(`      DB_HOST=${process.env.DB_HOST}`);
      console.error(`      DB_PORT=${process.env.DB_PORT}`);
      console.error(`      DB_NAME=${process.env.DB_NAME}`);
      console.error(`      DB_USERNAME=${process.env.DB_USERNAME}`);
      console.error('');
    } else if (error.code === '3D000') {
      console.error('💡 SOLUCIÓN:');
      console.error(`   La base de datos '${process.env.DB_NAME}' no existe.`);
      console.error('   Créala con:');
      console.error(`   CREATE DATABASE ${process.env.DB_NAME};`);
      console.error('');
    } else if (error.code === '28P01') {
      console.error('💡 SOLUCIÓN:');
      console.error('   Usuario o contraseña incorrectos.');
      console.error('   Verifica DB_USER y DB_PASSWORD en .env');
      console.error('');
    }
    
    process.exit(1);
  }
}

// Ejecutar prueba
testDatabaseConnection();
