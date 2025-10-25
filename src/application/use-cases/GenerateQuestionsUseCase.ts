import { GenerarPreguntasRequest, GenerarPreguntasResponse, PreguntaGenerada } from '../../domain/entities/QuestionGeneration';
import { IGeminiClient } from '../../domain/interfaces/IGeminiClient';
import { ICacheService } from '../../domain/interfaces/ICacheService';

export class GenerateQuestionsUseCase {
  constructor(
    private geminiClient: IGeminiClient,
    private cacheService: ICacheService
  ) {}

  async execute(request: GenerarPreguntasRequest): Promise<GenerarPreguntasResponse> {
    console.log('📝 [UseCase] Generando preguntas...');

    try {
      // Buscar en caché
      const cacheResult = await this.cacheService.buscarPreguntasEnCache(
        request.subtema_id,
        request.cantidad,
        request.dificultad
      );

      if (cacheResult.encontrado && cacheResult.data.length >= request.cantidad) {
        console.log(`✓ [UseCase] ${cacheResult.data.length} preguntas en caché`);
        return {
          preguntas: this.formatearPreguntas(cacheResult.data),
          subtema_id: request.subtema_id,
          cantidad_generada: cacheResult.data.length
        };
      }

      // Generar con Gemini
      const prompt = this.buildPrompt(request);
      
      console.log('🤖 [UseCase] Llamando a Gemini...');
      const respuestaGemini = await this.geminiClient.generate(prompt, {
        temperature: 0.8,
        maxTokens: 5000,
      });

      // 4. Limpiar y parsear la respuesta
      console.log('📝 [UseCase] Raw response from Gemini:', respuestaGemini); // Log para depurar

      let jsonResponse;
      try {
        // Extraer el bloque de código JSON de la respuesta
        // Buscar desde el final para evitar problemas con backticks anidados
        let jsonString = respuestaGemini.trim();
        
        // Si está envuelto en ```json ... ```, extraerlo
        if (jsonString.startsWith('```json')) {
          const lastBacktick = jsonString.lastIndexOf('```');
          if (lastBacktick > 7) {
            jsonString = jsonString.substring(7, lastBacktick).trim();
          }
        } else if (jsonString.startsWith('```')) {
          const lastBacktick = jsonString.lastIndexOf('```');
          if (lastBacktick > 3) {
            jsonString = jsonString.substring(3, lastBacktick).trim();
          }
        }
        
        jsonResponse = JSON.parse(jsonString);
      } catch (e) {
        console.error('❌ [UseCase] Failed to parse JSON from Gemini response.');
        console.error('Raw response:', respuestaGemini.substring(0, 500));
        throw new Error('Respuesta inválida de Gemini: no se pudo procesar el JSON.');
      }

      if (!jsonResponse.preguntas || !Array.isArray(jsonResponse.preguntas)) {
        throw new Error('El JSON de respuesta no tiene el formato esperado (falta la propiedad `preguntas`)');
      }

      // 5. Validar y formatear preguntas
      const preguntasValidas = this.validarPreguntas(jsonResponse.preguntas);
      console.log(`✓ [UseCase] ${preguntasValidas.length} preguntas válidas generadas.`);

      // 6. Guardar en caché si hay preguntas válidas
      if (preguntasValidas.length > 0) {
        await this.cacheService.guardarPreguntasEnCache(request.subtema_id, preguntasValidas);
      }

      // 7. Retornar respuesta
      return {
        preguntas: this.formatearPreguntas(preguntasValidas),
        subtema_id: request.subtema_id,
        cantidad_generada: preguntasValidas.length
      };

    } catch (error: any) {
      console.error('❌ [UseCase] Error:', error.message);
      throw new Error(`Error al generar preguntas: ${error.message}`);
    }
  }

  private buildPrompt(request: GenerarPreguntasRequest): string {
    const tema = request.tema || 'programación';
    const lenguaje = request.lenguaje || 'general';

    return `Genera ${request.cantidad} preguntas sobre ${tema} en ${lenguaje}.

🚨 OBLIGATORIO - LEE ESTO PRIMERO:
- Tema: ${tema}
- Lenguaje: ${lenguaje}
- TODAS las preguntas DEBEN usar sintaxis real de ${lenguaje}
- NO uses pseudocódigo
- NO hagas preguntas genéricas

EJEMPLO DE PREGUNTA CORRECTA:
"¿Qué imprime este código en ${lenguaje}?
for i in range(3):
    print(i)"

EJEMPLO DE PREGUNTA INCORRECTA (NO HAGAS ESTO):
"¿Cuál es el propósito de programar?" ❌

FORMATO DE RESPUESTA (JSON puro, sin markdown):
{
  "preguntas": [
    {
      "texto": "Pregunta con código de ${lenguaje} sobre ${tema}",
      "dificultad": "${request.dificultad}",
      "opciones": [
        {"texto": "Respuesta A", "es_correcta": true, "explicacion": "Por qué"},
        {"texto": "Respuesta B", "es_correcta": false, "explicacion": "Por qué no"},
        {"texto": "Respuesta C", "es_correcta": false, "explicacion": "Por qué no"},
        {"texto": "Respuesta D", "es_correcta": false, "explicacion": "Por qué no"}
      ],
      "retroalimentacion_correcta": "Bien",
      "retroalimentacion_incorrecta": "Recuerda",
      "concepto_clave": "${tema}"
    }
  ]
}`;  
  }

  private parseResponse(respuesta: string): any {
    try {
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No se encontró JSON');
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error('Respuesta inválida de Gemini');
    }
  }

  private validarPreguntas(preguntas: any[]): PreguntaGenerada[] {
    return preguntas.filter(p => {
      if (!p.texto || !p.opciones || p.opciones.length !== 4) return false;
      const correctas = p.opciones.filter((o: any) => o.es_correcta);
      return correctas.length === 1;
    });
  }

  private formatearPreguntas(preguntas: any[]): PreguntaGenerada[] {
    return preguntas.map(p => ({
      texto: p.texto,
      opciones: p.opciones,
      dificultad: p.dificultad,
      retroalimentacion_correcta: p.retroalimentacion_correcta,
      retroalimentacion_incorrecta: p.retroalimentacion_incorrecta,
      concepto_clave: p.concepto_clave
    }));
  }
}
