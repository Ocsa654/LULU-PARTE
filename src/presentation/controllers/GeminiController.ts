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

  /**
   * POST /api/v1/gemini/explicar-concepto
   * Explicar un concepto de programación
   */
  explicarConcepto = async (req: Request, res: Response) => {
    try {
      const { concepto, lenguaje, nivel } = req.body;
      const usuario_id = req.userId;

      if (!usuario_id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      if (!concepto) {
        return res.status(400).json({
          error: 'El campo concepto es requerido'
        });
      }

      // Construir prompt para explicación de concepto
      const prompt = `
Explica el concepto "${concepto}" en programación${lenguaje ? ` usando ${lenguaje}` : ''}.

**NIVEL DEL ESTUDIANTE:** ${nivel || 'intermedio'}

**INSTRUCCIONES:**
1. Empieza con una definición clara y simple
2. Proporciona ejemplos de código prácticos${lenguaje ? ` en ${lenguaje}` : ''}
3. Explica casos de uso comunes
4. Menciona errores comunes a evitar
5. Sugiere recursos para profundizar

**FORMATO DE RESPUESTA:**
- Definición
- Ejemplo de código
- Casos de uso
- Tips importantes
`;

      const explicacion = await this.validateCodeUseCase['geminiClient'].generate(prompt, {
        temperature: 0.7,
        maxTokens: 1500,
        tipo: 'explicacion_concepto'
      });

      res.json({
        success: true,
        data: {
          concepto,
          lenguaje: lenguaje || 'general',
          nivel: nivel || 'intermedio',
          explicacion
        }
      });

    } catch (error: any) {
      console.error('[Controller] Error en explicarConcepto:', error);
      res.status(500).json({
        error: 'Error al explicar concepto',
        mensaje: error.message
      });
    }
  };

  /**
   * POST /api/v1/gemini/generar-explicacion
   * Generar explicación línea por línea de código
   */
  generarExplicacion = async (req: Request, res: Response) => {
    try {
      const { codigo, lenguaje } = req.body;
      const usuario_id = req.userId;

      if (!usuario_id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      if (!codigo || !lenguaje) {
        return res.status(400).json({
          error: 'Los campos codigo y lenguaje son requeridos'
        });
      }

      // Construir prompt para explicación línea por línea
      const prompt = `
Analiza el siguiente código en ${lenguaje} y proporciona una explicación línea por línea.

**CÓDIGO:**
\`\`\`${lenguaje}
${codigo}
\`\`\`

**INSTRUCCIONES:**
1. Explica cada línea de código de forma clara
2. Identifica patrones y estructuras importantes
3. Menciona el propósito de cada parte
4. Señala buenas prácticas aplicadas

**RESPONDE EN JSON:**
{
  "resumen_general": "Descripción breve de qué hace el código",
  "lineas": [
    {
      "numero": 1,
      "codigo": "línea de código",
      "explicacion": "qué hace esta línea"
    }
  ],
  "conceptos_clave": ["concepto1", "concepto2"],
  "sugerencias_mejora": ["sugerencia1"]
}
`;

      const respuesta = await this.validateCodeUseCase['geminiClient'].generate(prompt, {
        temperature: 0.5,
        maxTokens: 2000,
        tipo: 'explicacion_linea_por_linea'
      });

      // Parsear respuesta JSON
      let explicacionParsed;
      try {
        let jsonString = respuesta.trim();
        if (jsonString.startsWith('```json')) {
          const lastBacktick = jsonString.lastIndexOf('```');
          if (lastBacktick > 7) {
            jsonString = jsonString.substring(7, lastBacktick).trim();
          }
        }
        explicacionParsed = JSON.parse(jsonString);
      } catch (e) {
        explicacionParsed = {
          resumen_general: respuesta,
          lineas: [],
          conceptos_clave: [],
          sugerencias_mejora: []
        };
      }

      res.json({
        success: true,
        data: explicacionParsed
      });

    } catch (error: any) {
      console.error('[Controller] Error en generarExplicacion:', error);
      res.status(500).json({
        error: 'Error al generar explicación',
        mensaje: error.message
      });
    }
  };
}
