import { CodeValidationRequest, CodeValidationResponse } from '../../domain/entities/CodeValidationRequest';
import { IGeminiClient } from '../../domain/interfaces/IGeminiClient';
import { ICacheService } from '../../domain/interfaces/ICacheService';
import { RetroalimentacionRepository } from '../../infrastructure/database/repositories/RetroalimentacionRepository';
import crypto from 'crypto';

export class ValidateCodeUseCase {
  private retroalimentacionRepo: RetroalimentacionRepository;

  constructor(
    private geminiClient: IGeminiClient,
    private cacheService: ICacheService
  ) {
    this.retroalimentacionRepo = new RetroalimentacionRepository();
  }

  async execute(request: CodeValidationRequest): Promise<CodeValidationResponse> {
    console.log('🔍 [UseCase] Iniciando validación de código...');
    
    try {
      // Buscar en caché primero
      const cacheResult = await this.cacheService.buscarCodigoEnCache(
        request.codigo_enviado,
        request.ejercicio_id
      );

      if (cacheResult.encontrado) {
        console.log('✓ [UseCase] Respuesta encontrada en caché');
        return {
          resultado: cacheResult.data.resultado,
          puntos_obtenidos: cacheResult.data.puntos,
          retroalimentacion_llm: cacheResult.data.retroalimentacion,
          errores_encontrados: [],
          casos_prueba_pasados: 0,
          casos_prueba_totales: 0
        };
      }

      // Construir prompt
      const prompt = this.buildPrompt(request);

      // Llamar a Gemini
      console.log('🤖 [UseCase] Llamando a Gemini...');
      const respuestaGemini = await this.geminiClient.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1500,
        tipo: 'code_validation'
      });

      // Parsear respuesta
      const resultado = this.parseResponse(respuestaGemini);

      // Calcular puntos
      const puntosMaximos = 100;
      const puntosObtenidos = this.calcularPuntos(resultado, puntosMaximos);

      const response: CodeValidationResponse = {
        resultado: resultado.resultado,
        puntos_obtenidos: puntosObtenidos,
        retroalimentacion_llm: resultado.retroalimentacion_educativa,
        errores_encontrados: resultado.errores_encontrados || [],
        casos_prueba_pasados: resultado.casos_prueba_pasados || 0,
        casos_prueba_totales: resultado.casos_prueba_totales || 0
      };

      // Guardar en caché
      await this.cacheService.guardarCodigoEnCache(
        request.codigo_enviado,
        request.ejercicio_id,
        request.usuario_id,
        response
      );

      // Guardar en base de datos (caché persistente)
      try {
        const codigoHash = crypto.createHash('md5').update(request.codigo_enviado).digest('hex');
        
        const guardado = await this.retroalimentacionRepo.guardarRetroalimentacion({
          usuarioId: request.usuario_id,
          tipoRetroalimentacion: 'validacion_codigo',
          contenidoRetroalimentacion: response.retroalimentacion_llm,
          contextoOriginal: {
            ejercicio_id: request.ejercicio_id,
            codigo_hash: codigoHash,
            codigo_enviado: request.codigo_enviado,
            lenguaje: request.lenguaje,
            resultado: response.resultado,
            puntos: response.puntos_obtenidos,
          },
          modeloLlmUsado: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        });
        
        if (guardado) {
          console.log('💾 [UseCase] Retroalimentación guardada en BD');
        } else {
          console.log('⚠️ [UseCase] BD no disponible - Solo guardado en caché');
        }
      } catch (dbError: any) {
        console.warn('⚠️ [UseCase] Error al guardar en BD (continuando):', dbError.message);
        // No fallar si la BD tiene problemas, solo loguear
      }

      console.log(`✓ [UseCase] Validación completada: ${response.resultado}`);
      return response;

    } catch (error: any) {
      console.error('❌ [UseCase] Error:', error.message);
      return {
        resultado: 'error',
        puntos_obtenidos: 0,
        retroalimentacion_llm: 'Hubo un error al procesar tu código. Por favor, intenta nuevamente.',
        errores_encontrados: [error.message],
        casos_prueba_pasados: 0,
        casos_prueba_totales: 0
      };
    }
  }

  private buildPrompt(request: CodeValidationRequest): string {
    return `
Eres un asistente educativo experto en programación. Analiza el código del estudiante y proporciona retroalimentación pedagógica.

**CÓDIGO DEL ESTUDIANTE:**
\`\`\`${request.lenguaje}
${request.codigo_enviado}
\`\`\`

**ENUNCIADO:**
${request.enunciado || 'No especificado'}

**CASOS DE PRUEBA:**
${JSON.stringify(request.casos_prueba, null, 2)}

**INSTRUCCIONES:**
1. Analiza el código y verifica si es correcto
2. Identifica errores de sintaxis o lógica
3. Proporciona retroalimentación educativa y constructiva


**RESPONDE EN JSON:**
{
  "resultado": "correcto" | "incorrecto" | "error",
  "errores_encontrados": ["lista de errores"],
  "casos_prueba_pasados": número,
  "casos_prueba_totales": ${Array.isArray(request.casos_prueba) ? request.casos_prueba.length : 0},
  "retroalimentacion_educativa": "Explicación paso a paso",
  "sugerencias_mejora": ["sugerencias"]
}
`;
  }

  private parseResponse(respuesta: string): any {
    try {
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON en la respuesta');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error al parsear respuesta:', error);
      throw new Error('Respuesta inválida de Gemini');
    }
  }

  private calcularPuntos(resultado: any, puntosMaximos: number): number {
    if (resultado.resultado === 'correcto') {
      return puntosMaximos;
    }
    if (resultado.resultado === 'incorrecto' && resultado.casos_prueba_pasados) {
      const porcentaje = resultado.casos_prueba_pasados / resultado.casos_prueba_totales;
      return Math.round(puntosMaximos * porcentaje);
    }
    return 0;
  }
}
