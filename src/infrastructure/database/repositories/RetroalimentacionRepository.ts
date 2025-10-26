import { Repository } from 'typeorm';
import { AppDataSource } from '../database.config';
import { RetroalimentacionLlm } from '../models/RetroalimentacionLlm';

/**
 * Repositorio para manejar retroalimentaciones LLM
 * Implementa caché persistente y consultas de historial
 */
export class RetroalimentacionRepository {
  private repository: Repository<RetroalimentacionLlm> | null = null;

  constructor() {
    if (AppDataSource.isInitialized) {
      this.repository = AppDataSource.getRepository(RetroalimentacionLlm);
    }
  }

  private checkConnection(): boolean {
    if (!this.repository) {
      console.warn('⚠️ [RetroalimentacionRepository] PostgreSQL no disponible');
      return false;
    }
    return true;
  }

  /**
   * Guardar nueva retroalimentación
   */
  async guardarRetroalimentacion(data: {
    usuarioId: number;
    tipoRetroalimentacion: string;
    contenidoRetroalimentacion: string;
    contextoOriginal: any;
    modeloLlmUsado: string;
  }): Promise<RetroalimentacionLlm | null> {
    if (!this.checkConnection() || !this.repository) return null;

    const retroalimentacion = this.repository.create({
      usuarioId: data.usuarioId,
      tipoRetroalimentacion: data.tipoRetroalimentacion,
      contenidoRetroalimentacion: data.contenidoRetroalimentacion,
      contextoOriginal: data.contextoOriginal,
      generadoPorLlm: true,
      modeloLlmUsado: data.modeloLlmUsado,
    });

    return await this.repository.save(retroalimentacion);
  }

  /**
   * Buscar retroalimentación en caché (para validación de código)
   * Busca por hash del código para evitar llamadas repetidas a Gemini
   */
  async buscarEnCache(codigoHash: string, ejercicioId: number): Promise<RetroalimentacionLlm | null> {
    if (!this.checkConnection() || !this.repository) return null;

    const retroalimentacion = await this.repository
      .createQueryBuilder('retro')
      .where("retro.contextoOriginal->>'codigo_hash' = :codigoHash", { codigoHash })
      .andWhere("retro.contextoOriginal->>'ejercicio_id' = :ejercicioId", { ejercicioId: ejercicioId.toString() })
      .andWhere("retro.tipo_retroalimentacion = 'validacion_codigo'")
      .orderBy('retro.fecha_generacion', 'DESC')
      .getOne();

    return retroalimentacion;
  }

  /**
   * Obtener historial de retroalimentaciones de un usuario
   */
  async obtenerHistorial(usuarioId: number, limite: number = 10): Promise<RetroalimentacionLlm[]> {
    if (!this.checkConnection() || !this.repository) return [];

    return await this.repository.find({
      where: { usuarioId },
      order: { fechaGeneracion: 'DESC' },
      take: limite,
    });
  }

  /**
   * Obtener retroalimentaciones por tipo
   */
  async obtenerPorTipo(usuarioId: number, tipo: string, limite: number = 10): Promise<RetroalimentacionLlm[]> {
    if (!this.checkConnection() || !this.repository) return [];

    return await this.repository.find({
      where: { 
        usuarioId,
        tipoRetroalimentacion: tipo
      },
      order: { fechaGeneracion: 'DESC' },
      take: limite,
    });
  }

  /**
   * Contar retroalimentaciones generadas (para estadísticas)
   */
  async contarPorModelo(modeloLlm: string): Promise<number> {
    if (!this.checkConnection() || !this.repository) return 0;

    return await this.repository.count({
      where: { modeloLlmUsado: modeloLlm }
    });
  }

  /**
   * Obtener estadísticas de uso
   */
  async obtenerEstadisticas(): Promise<{
    total: number;
    porTipo: Record<string, number>;
    porModelo: Record<string, number>;
  }> {
    if (!this.checkConnection() || !this.repository) {
      return { total: 0, porTipo: {}, porModelo: {} };
    }

    const total = await this.repository.count();

    // Agrupar por tipo
    const porTipo = await this.repository
      .createQueryBuilder('retro')
      .select('retro.tipo_retroalimentacion', 'tipo')
      .addSelect('COUNT(*)', 'count')
      .groupBy('retro.tipo_retroalimentacion')
      .getRawMany();

    // Agrupar por modelo
    const porModelo = await this.repository
      .createQueryBuilder('retro')
      .select('retro.modelo_llm_usado', 'modelo')
      .addSelect('COUNT(*)', 'count')
      .groupBy('retro.modelo_llm_usado')
      .getRawMany();

    return {
      total,
      porTipo: porTipo.reduce((acc, item) => ({ ...acc, [item.tipo]: parseInt(item.count) }), {}),
      porModelo: porModelo.reduce((acc, item) => ({ ...acc, [item.modelo]: parseInt(item.count) }), {}),
    };
  }
}
