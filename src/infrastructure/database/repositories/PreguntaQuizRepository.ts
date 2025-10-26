import { Repository } from 'typeorm';
import { AppDataSource } from '../database.config';
import { PreguntaQuiz, DificultadPregunta, TipoPregunta } from '../models/PreguntaQuiz';
import { OpcionRespuesta } from '../models/OpcionRespuesta';

/**
 * Repositorio para manejar preguntas de quiz
 * Guarda preguntas generadas por Gemini en la base de datos
 */
export class PreguntaQuizRepository {
  private preguntaRepository: Repository<PreguntaQuiz> | null = null;
  private opcionRepository: Repository<OpcionRespuesta> | null = null;

  constructor() {
    if (AppDataSource.isInitialized) {
      this.preguntaRepository = AppDataSource.getRepository(PreguntaQuiz);
      this.opcionRepository = AppDataSource.getRepository(OpcionRespuesta);
    }
  }

  private checkConnection(): boolean {
    if (!this.preguntaRepository || !this.opcionRepository) {
      console.warn('⚠️ [PreguntaQuizRepository] PostgreSQL no disponible');
      return false;
    }
    return true;
  }

  /**
   * Guardar pregunta con sus opciones
   */
  async guardarPregunta(data: {
    subtemaId: number;
    preguntaTexto: string;
    dificultad: DificultadPregunta;
    opciones: Array<{
      textoOpcion: string;
      esCorrecta: boolean;
      explicacion?: string;
      orden?: number;
    }>;
    retroalimentacionCorrecta?: string;
    retroalimentacionIncorrecta?: string;
    conceptoClave?: string;
    modeloLlmUsado?: string;
  }): Promise<PreguntaQuiz | null> {
    if (!this.checkConnection() || !this.preguntaRepository || !this.opcionRepository) return null;

    // Crear pregunta
    const pregunta = this.preguntaRepository.create({
      subtemaId: data.subtemaId,
      preguntaTexto: data.preguntaTexto,
      tipoPregunta: TipoPregunta.OPCION_MULTIPLE,
      generadoPorLlm: true,
      dificultad: data.dificultad,
      retroalimentacionCorrecta: data.retroalimentacionCorrecta,
      retroalimentacionIncorrecta: data.retroalimentacionIncorrecta,
      conceptoClave: data.conceptoClave,
    });

    // Guardar pregunta
    const preguntaGuardada = await this.preguntaRepository.save(pregunta);

    // Crear y guardar opciones
    const opciones = data.opciones.map((opcion, index) =>
      this.opcionRepository.create({
        preguntaId: preguntaGuardada.id,
        textoOpcion: opcion.textoOpcion,
        esCorrecta: opcion.esCorrecta,
        explicacion: opcion.explicacion,
        orden: opcion.orden || index + 1,
      })
    );

    await this.opcionRepository.save(opciones);

    // Retornar pregunta con opciones
    return await this.preguntaRepository.findOne({
      where: { id: preguntaGuardada.id },
      relations: ['opciones'],
    }) as PreguntaQuiz;
  }

  /**
   * Buscar preguntas existentes por subtema y dificultad (caché)
   */
  async buscarPreguntasExistentes(
    subtemaId: number,
    dificultad: DificultadPregunta,
    cantidad: number
  ): Promise<PreguntaQuiz[]> {
    return await this.preguntaRepository.find({
      where: {
        subtemaId,
        dificultad,
        generadoPorLlm: true,
      },
      relations: ['opciones'],
      order: { fechaGeneracion: 'DESC' },
      take: cantidad,
    });
  }

  /**
   * Obtener pregunta por ID con opciones
   */
  async obtenerPorId(id: number): Promise<PreguntaQuiz | null> {
    return await this.preguntaRepository.findOne({
      where: { id },
      relations: ['opciones'],
    });
  }

  /**
   * Obtener preguntas de un subtema
   */
  async obtenerPorSubtema(subtemaId: number, limite: number = 20): Promise<PreguntaQuiz[]> {
    return await this.preguntaRepository.find({
      where: { subtemaId },
      relations: ['opciones'],
      order: { fechaGeneracion: 'DESC' },
      take: limite,
    });
  }

  /**
   * Contar preguntas generadas por LLM
   */
  async contarPreguntasGeneradas(subtemaId?: number): Promise<number> {
    const where: any = { generadoPorLlm: true };
    if (subtemaId) {
      where.subtemaId = subtemaId;
    }
    return await this.preguntaRepository.count({ where });
  }

  /**
   * Obtener estadísticas de preguntas
   */
  async obtenerEstadisticas(): Promise<{
    total: number;
    porDificultad: Record<string, number>;
    porSubtema: Record<number, number>;
  }> {
    const total = await this.preguntaRepository.count();

    // Agrupar por dificultad
    const porDificultad = await this.preguntaRepository
      .createQueryBuilder('pregunta')
      .select('pregunta.dificultad', 'dificultad')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pregunta.dificultad')
      .getRawMany();

    // Agrupar por subtema
    const porSubtema = await this.preguntaRepository
      .createQueryBuilder('pregunta')
      .select('pregunta.subtema_id', 'subtema')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pregunta.subtema_id')
      .getRawMany();

    return {
      total,
      porDificultad: porDificultad.reduce((acc, item) => ({ ...acc, [item.dificultad]: parseInt(item.count) }), {}),
      porSubtema: porSubtema.reduce((acc, item) => ({ ...acc, [item.subtema]: parseInt(item.count) }), {}),
    };
  }
}
