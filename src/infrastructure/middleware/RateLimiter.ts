import { Request, Response, NextFunction } from 'express';

interface RateLimitState {
  requests_en_ventana: number;
  ventana_inicio: Date;
  cola_pendiente: Array<{
    resolve: Function;
    reject: Function;
    timestamp: Date;
  }>;
}

export class RateLimiter {
  private static state: RateLimitState = {
    requests_en_ventana: 0,
    ventana_inicio: new Date(),
    cola_pendiente: []
  };

  private static readonly RPM_LIMIT = parseInt(process.env.GEMINI_RPM_LIMIT || '15');
  private static readonly VENTANA_MS = 60000;

  static middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.esperarDisponibilidad();
        next();
      } catch (error) {
        res.status(429).json({
          error: 'Rate limit excedido',
          mensaje: 'Demasiadas peticiones. Por favor espera un momento.',
          retry_after: this.calcularTiempoEspera()
        });
      }
    };
  }

  private static async esperarDisponibilidad(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tiempoTranscurrido = Date.now() - this.state.ventana_inicio.getTime();
      
      if (tiempoTranscurrido >= this.VENTANA_MS) {
        this.state.requests_en_ventana = 0;
        this.state.ventana_inicio = new Date();
      }

      if (this.state.requests_en_ventana < this.RPM_LIMIT) {
        this.state.requests_en_ventana++;
        console.log(`✓ [RateLimit] Request permitido: ${this.state.requests_en_ventana}/${this.RPM_LIMIT}`);
        resolve();
      } else {
        console.log(`⏳ [RateLimit] Límite alcanzado. Encolando request...`);
        this.state.cola_pendiente.push({ resolve, reject, timestamp: new Date() });
        
        setTimeout(() => {
          this.procesarCola();
        }, this.VENTANA_MS - tiempoTranscurrido);
      }

      const porcentajeUso = (this.state.requests_en_ventana / this.RPM_LIMIT) * 100;
      if (porcentajeUso >= 80) {
        console.warn(`⚠️ [RateLimit] Uso al ${porcentajeUso.toFixed(0)}%`);
      }
    });
  }

  private static procesarCola() {
    while (this.state.cola_pendiente.length > 0 && 
           this.state.requests_en_ventana < this.RPM_LIMIT) {
      const pendiente = this.state.cola_pendiente.shift();
      if (pendiente) {
        this.state.requests_en_ventana++;
        pendiente.resolve();
      }
    }
  }

  private static calcularTiempoEspera(): number {
    const tiempoTranscurrido = Date.now() - this.state.ventana_inicio.getTime();
    return Math.ceil((this.VENTANA_MS - tiempoTranscurrido) / 1000);
  }

  static getStats() {
    return {
      requests_en_ventana: this.state.requests_en_ventana,
      limite_rpm: this.RPM_LIMIT,
      cola_pendiente: this.state.cola_pendiente.length,
      porcentaje_uso: (this.state.requests_en_ventana / this.RPM_LIMIT) * 100
    };
  }
}
