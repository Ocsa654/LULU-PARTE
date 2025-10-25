import { Request, Response } from 'express';
import { ValidateCodeUseCase } from '../../application/use-cases/ValidateCodeUseCase';
import { GenerateQuestionsUseCase } from '../../application/use-cases/GenerateQuestionsUseCase';
import { ChatAssistantUseCase } from '../../application/use-cases/ChatAssistantUseCase';

export class GeminiController {
  constructor(
    private validateCodeUseCase: ValidateCodeUseCase,
    private generateQuestionsUseCase: GenerateQuestionsUseCase,
    private chatAssistantUseCase: ChatAssistantUseCase
  ) {}

  validateCode = async (req: Request, res: Response) => {
    try {
      const { codigo_enviado, ejercicio_id, casos_prueba, lenguaje, enunciado } = req.body;

      if (!codigo_enviado || !ejercicio_id || !lenguaje) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: codigo_enviado, ejercicio_id, lenguaje'
        });
      }

      // Obtener usuario_id del token JWT (authMiddleware)
      const usuario_id = req.userId;

      if (!usuario_id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      const resultado = await this.validateCodeUseCase.execute({
        codigo_enviado,
        ejercicio_id,
        usuario_id,
        casos_prueba: casos_prueba || [],
        lenguaje,
        enunciado
      });

      res.json({
        success: true,
        data: resultado
      });

    } catch (error: any) {
      console.error('[Controller] Error en validateCode:', error);
      res.status(500).json({
        error: 'Error al validar código',
        mensaje: error.message
      });
    }
  };

  generateQuestions = async (req: Request, res: Response) => {
    try {
      const { subtema_id, cantidad, dificultad } = req.body;

      if (!subtema_id) {
        return res.status(400).json({
          error: 'Falta campo requerido: subtema_id'
        });
      }

      const resultado = await this.generateQuestionsUseCase.execute({
        subtema_id,
        cantidad: cantidad || 5,
        dificultad: dificultad || 'intermedia'
      });

      res.json({
        success: true,
        data: resultado
      });

    } catch (error: any) {
      console.error('[Controller] Error en generateQuestions:', error);
      res.status(500).json({
        error: 'Error al generar preguntas',
        mensaje: error.message
      });
    }
  };

  chat = async (req: Request, res: Response) => {
    try {
      const { mensaje, historial, contexto } = req.body;

      if (!mensaje || mensaje.trim().length === 0) {
        return res.status(400).json({
          error: 'El mensaje no puede estar vacío'
        });
      }

      // Obtener usuario_id del token JWT (authMiddleware)
      const usuario_id = req.userId;

      if (!usuario_id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      const resultado = await this.chatAssistantUseCase.execute(usuario_id, {
        mensaje,
        historial,
        contexto
      });

      res.json({
        success: true,
        data: resultado
      });

    } catch (error: any) {
      console.error('[Controller] Error en chat:', error);
      res.status(500).json({
        error: 'Error en chat',
        mensaje: error.message
      });
    }
  };

  limpiarChat = async (req: Request, res: Response) => {
    try {
      // Obtener usuario_id del token JWT (authMiddleware)
      const usuario_id = req.userId;

      if (!usuario_id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      ChatAssistantUseCase.limpiarHistorial(usuario_id);

      res.json({
        success: true,
        mensaje: 'Historial limpiado'
      });

    } catch (error: any) {
      res.status(500).json({
        error: 'Error al limpiar chat',
        mensaje: error.message
      });
    }
  };
}
