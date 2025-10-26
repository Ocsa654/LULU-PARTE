import { Router } from 'express';
import { RetroalimentacionController } from '../controllers/RetroalimentacionController';
import { authMiddleware } from '../../infrastructure/middleware/AuthMiddleware';

export function createRetroalimentacionRoutes(controller: RetroalimentacionController): Router {
  const router = Router();

  /**
   * GET /api/v1/retroalimentacion/:usuario_id
   * Obtener historial de retroalimentaciones
   * 🔒 Requiere autenticación
   */
  router.get('/:usuario_id', authMiddleware, controller.obtenerHistorial);

  /**
   * POST /api/v1/retroalimentacion/generar
   * Generar retroalimentación personalizada
   * 🔒 Requiere autenticación
   */
  router.post('/generar', authMiddleware, controller.generarRetroalimentacion);

  /**
   * GET /api/v1/retroalimentacion/stats
   * Estadísticas de retroalimentaciones
   * 📊 Ruta pública
   */
  router.get('/stats', controller.obtenerEstadisticas);

  return router;
}
