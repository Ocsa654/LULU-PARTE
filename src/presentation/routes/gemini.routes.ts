import { Router } from 'express';
import { GeminiController } from '../controllers/GeminiController';
import { RateLimiter } from '../../infrastructure/middleware/RateLimiter';
import { authMiddleware } from '../../infrastructure/middleware/AuthMiddleware';

export function createGeminiRoutes(geminiController: GeminiController): Router {
  const router = Router();

  // Aplicar rate limiter a todas las rutas
  router.use(RateLimiter.middleware());

  /**
   * POST /api/v1/gemini/validate-code
   * Validar código de estudiante
   * 🔒 Requiere autenticación
   */
  router.post('/validate-code', authMiddleware, geminiController.validateCode);

  /**
   * POST /api/v1/gemini/generate-questions
   * Generar preguntas de quiz
   * 🔒 Requiere autenticación
   */
  router.post('/generate-questions', authMiddleware, geminiController.generateQuestions);

  /**
   * POST /api/v1/gemini/chat
   * Chat con asistente educativo
   * 🔒 Requiere autenticación
   */
  router.post('/chat', authMiddleware, geminiController.chat);

  /**
   * DELETE /api/v1/gemini/chat
   * Limpiar historial de chat
   * 🔒 Requiere autenticación
   */
  router.delete('/chat', authMiddleware, geminiController.limpiarChat);

  /**
   * POST /api/v1/gemini/explicar-concepto
   * Explicar un concepto de programación
   * 🔒 Requiere autenticación
   */
  router.post('/explicar-concepto', authMiddleware, geminiController.explicarConcepto);

  /**
   * POST /api/v1/gemini/generar-explicacion
   * Explicar código línea por línea
   * 🔒 Requiere autenticación
   */
  router.post('/generar-explicacion', authMiddleware, geminiController.generarExplicacion);

  /**
   * GET /api/v1/gemini/stats
   * Estadísticas de rate limiter
   * 📊 Ruta pública (sin autenticación)
   */
  router.get('/stats', (req, res) => {
    const stats = RateLimiter.getStats();
    res.json({
      success: true,
      data: stats
    });
  });

  return router;
}
