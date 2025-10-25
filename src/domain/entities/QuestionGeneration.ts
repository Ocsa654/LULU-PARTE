export interface GenerarPreguntasRequest {
  subtema_id: number;
  cantidad: number;
  dificultad: 'básica' | 'intermedia' | 'avanzada';
  tema?: string;
  lenguaje?: string;
  contexto_estudiante?: {
    nivel?: string;
    intentos_previos?: number;
    temas_debiles?: string[];
  };
}

export interface OpcionRespuesta {
  texto: string;
  es_correcta: boolean;
  explicacion?: string;
}

export interface PreguntaGenerada {
  texto: string;
  opciones: OpcionRespuesta[];
  dificultad: string;
  retroalimentacion_correcta: string;
  retroalimentacion_incorrecta: string;
  concepto_clave?: string;
}

export interface GenerarPreguntasResponse {
  preguntas: PreguntaGenerada[];
  subtema_id: number;
  cantidad_generada: number;
}
