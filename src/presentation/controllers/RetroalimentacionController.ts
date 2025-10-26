import { Request, Response } from 'express';
import { RetroalimentacionRepository } from '../../infrastructure/database/repositories/RetroalimentacionRepository';
import { IGeminiClient } from '../../domain/interfaces/IGeminiClient';

/**
 * Controlador para endpoints de retroalimentación
 */
export class RetroalimentacionController {
  private retroalimentacionRepo: RetroalimentacionRepository;

  constructor(private geminiClient: IGeminiClient) {
    this.retroalimentacionRepo = new RetroalimentacionRepository();
  }

  /**
   * GET /api/v1/retroalimentacion/:usuario_id
   * Obtener historial de retroalimentaciones de un usuario
   */
  obtenerHistorial = async (req: Request, res: Response) => {
    try {
      const usuarioId = parseInt(req.params.usuario_id);
      const limite = parseInt(req.query.limite as string) || 10;
      const tipo = req.query.tipo as string;

      if (!usuarioId) {
        return res.status(400).json({
          error: 'usuario_id es requerido'
        });
      }

      let retroalimentaciones;
      
      if (tipo) {
        retroalimentaciones = await this.retroalimentacionRepo.obtenerPorTipo(usuarioId, tipo, limite);
      } else {
        retroalimentaciones = await this.retroalimentacionRepo.obtenerHistorial(usuarioId, limite);
      }

      res.json({
        success: true,
        data: {
          usuario_id: usuarioId,
          total: retroalimentaciones.length,
          retroalimentaciones: retroalimentaciones.map(r => ({
            id: r.id,
            tipo: r.tipoRetroalimentacion,
            contenido: r.contenidoRetroalimentacion,
            contexto: r.contextoOriginal,
            modelo_usado: r.modeloLlmUsado,
            fecha: r.fechaGeneracion
          }))
        }
      });

    } catch (error: any) {
      console.error('[Controller] Error en obtenerHistorial:', error);
      res.status(500).json({
        error: 'Error al obtener historial',
        mensaje: error.message
      });
    }
  };

  /**
   * POST /api/v1/retroalimentacion/generar
   * Generar retroalimentación personalizada
   */
  generarRetroalimentacion = async (req: Request, res: Response) => {
    try {
      const { contexto, pregunta, tipo } = req.body;
      const usuarioId = req.userId;

      if (!usuarioId) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      if (!pregunta) {
        return res.status(400).json({
          error: 'El campo pregunta es requerido'
        });
      }

      // Construir prompt personalizado
      const prompt = `
Eres un asistente educativo especializado en programación.

**CONTEXTO:**
${contexto ? JSON.stringify(contexto, null, 2) : 'No proporcionado'}

**PREGUNTA DEL ESTUDIANTE:**
${pregunta}

**INSTRUCCIONES:**
1. Proporciona una respuesta clara y educativa
2. Usa ejemplos prácticos cuando sea posible
3. Sé motivador y constructivo
4. Adapta el nivel de complejidad al contexto

**RESPONDE DE FORMA DIRECTA:**
`;

      // Llamar a Gemini
      const respuesta = await this.geminiClient.generate(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
        tipo: 'retroalimentacion_personalizada'
      });

      // Guardar en BD
      const retroalimentacion = await this.retroalimentacionRepo.guardarRetroalimentacion({
        usuarioId,
        tipoRetroalimentacion: tipo || 'retroalimentacion_personalizada',
        contenidoRetroalimentacion: respuesta,
        contextoOriginal: {
          pregunta,
          contexto
        },
        modeloLlmUsado: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      });

      res.json({
        success: true,
        data: {
          id: retroalimentacion.id,
          retroalimentacion: respuesta,
          fecha: retroalimentacion.fechaGeneracion
        }
      });

    } catch (error: any) {
      console.error('[Controller] Error en generarRetroalimentacion:', error);
      res.status(500).json({
        error: 'Error al generar retroalimentación',
        mensaje: error.message
      });
    }
  };

  /**
   * GET /api/v1/retroalimentacion/stats
   * Obtener estadísticas de uso de retroalimentaciones
   */
  obtenerEstadisticas = async (req: Request, res: Response) => {
    try {
      const stats = await this.retroalimentacionRepo.obtenerEstadisticas();

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error('[Controller] Error en obtenerEstadisticas:', error);
      res.status(500).json({
        error: 'Error al obtener estadísticas',
        mensaje: error.message
      });
    }
  };
}
