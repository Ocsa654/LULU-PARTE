import { ChatRequest, ChatResponse, ChatMessage } from '../../domain/entities/Chat';
import { IGeminiClient } from '../../domain/interfaces/IGeminiClient';

export class ChatAssistantUseCase {
  private static conversaciones = new Map<number, ChatMessage[]>();

  constructor(private geminiClient: IGeminiClient) {}

  async execute(usuario_id: number, request: ChatRequest): Promise<ChatResponse> {
    console.log(`💬 [UseCase] Chat usuario ${usuario_id}`);

    try {
      // Obtener historial
      let historial = request.historial || this.obtenerHistorial(usuario_id);

      // Agregar mensaje del usuario
      historial.push({
        role: 'user',
        content: request.mensaje,
        timestamp: new Date()
      });

      // Construir prompt
      const prompt = this.buildPrompt(request.mensaje, historial, request.contexto);

      // Llamar a Gemini
      const respuestaGemini = await this.geminiClient.generate(prompt, {
        temperature: 0.9,
        maxTokens: 800,
        tipo: 'chat_assistant'
      });

      // Agregar respuesta al historial
      historial.push({
        role: 'assistant',
        content: respuestaGemini,
        timestamp: new Date()
      });

      // Guardar historial (últimos 10 mensajes)
      this.guardarHistorial(usuario_id, historial.slice(-10));

      const sugerencias = this.generarSugerencias(request.contexto);

      return {
        respuesta: respuestaGemini,
        contexto_usado: !!request.contexto,
        sugerencias
      };

    } catch (error: any) {
      console.error('❌ [UseCase] Error en chat:', error.message);
      throw new Error(`Error en chat: ${error.message}`);
    }
  }

  private buildPrompt(mensaje: string, historial: ChatMessage[], contexto?: any): string {
    const historialText = historial.slice(-5).map(m => 
      `${m.role === 'user' ? 'Estudiante' : 'Asistente'}: ${m.content}`
    ).join('\n');

    const contextoText = contexto ? `
**CONTEXTO:**
- Tema: ${contexto.tema_actual || 'No especificado'}
- Subtema: ${contexto.subtema_actual || 'No especificado'}
` : '';

    return `
Eres un asistente educativo amigable especializado en programación.

**TU ROL:**
- Guía al estudiante hacia la comprensión
- Haz preguntas para estimular pensamiento crítico
- Proporciona pistas, no soluciones completas
- Sé paciente y motivador

${contextoText}

**HISTORIAL:**
${historialText}

**MENSAJE ACTUAL:**
${mensaje}

**RESPONDE DE FORMA NATURAL Y EDUCATIVA:**
`;
  }

  private obtenerHistorial(usuario_id: number): ChatMessage[] {
    return ChatAssistantUseCase.conversaciones.get(usuario_id) || [];
  }

  private guardarHistorial(usuario_id: number, historial: ChatMessage[]): void {
    ChatAssistantUseCase.conversaciones.set(usuario_id, historial);
  }

  static limpiarHistorial(usuario_id: number): void {
    this.conversaciones.delete(usuario_id);
  }

  private generarSugerencias(contexto?: any): string[] {
    const sugerencias: string[] = [];
    
    if (contexto?.tema_actual) {
      sugerencias.push(`¿Puedes explicarme más sobre ${contexto.tema_actual}?`);
    }
    
    if (sugerencias.length === 0) {
      sugerencias.push('¿Qué temas puedo estudiar?');
      sugerencias.push('Dame un ejemplo práctico');
    }
    
    return sugerencias.slice(0, 3);
  }
}
