import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PreguntaQuiz } from './PreguntaQuiz';

@Entity('opciones_respuesta')
export class OpcionRespuesta {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'pregunta_id' })
  preguntaId!: number;

  @Column({ type: 'text', name: 'texto_opcion' })
  textoOpcion!: string;

  @Column({ type: 'boolean', default: false, name: 'es_correcta' })
  esCorrecta!: boolean;

  @Column({ type: 'text', nullable: true })
  explicacion?: string;

  @Column({ type: 'int', nullable: true })
  orden?: number;

  // Relaciones
  @ManyToOne(() => PreguntaQuiz, (pregunta) => pregunta.opciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pregunta_id' })
  pregunta?: PreguntaQuiz;
}
