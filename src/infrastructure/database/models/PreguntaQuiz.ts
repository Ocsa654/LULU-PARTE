import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Subtema } from './Subtema';
import { OpcionRespuesta } from './OpcionRespuesta';

export enum TipoPregunta {
  OPCION_MULTIPLE = 'opcion_multiple',
  VERDADERO_FALSO = 'verdadero_falso',
  RESPUESTA_CORTA = 'respuesta_corta'
}

export enum DificultadPregunta {
  BASICA = 'básica',
  INTERMEDIA = 'intermedia',
  AVANZADA = 'avanzada'
}

@Entity('preguntas_quiz')
export class PreguntaQuiz {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'subtema_id' })
  subtemaId!: number;

  @Column({ type: 'text', name: 'pregunta_texto' })
  preguntaTexto!: string;

  @Column({
    type: 'enum',
    enum: TipoPregunta,
    nullable: true,
    name: 'tipo_pregunta'
  })
  tipoPregunta!: TipoPregunta;

  @Column({ type: 'boolean', default: true, name: 'generado_por_llm' })
  generadoPorLlm!: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_generacion' })
  fechaGeneracion!: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true
  })
  dificultad!: DificultadPregunta;

  @Column({ type: 'text', nullable: true, name: 'retroalimentacion_correcta' })
  retroalimentacionCorrecta?: string;

  @Column({ type: 'text', nullable: true, name: 'retroalimentacion_incorrecta' })
  retroalimentacionIncorrecta?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'concepto_clave' })
  conceptoClave?: string;

  // Relaciones
  @ManyToOne(() => Subtema, { nullable: true })
  @JoinColumn({ name: 'subtema_id' })
  subtema?: Subtema;

  @OneToMany(() => OpcionRespuesta, (opcion) => opcion.pregunta, { cascade: true })
  opciones!: OpcionRespuesta[];
}
