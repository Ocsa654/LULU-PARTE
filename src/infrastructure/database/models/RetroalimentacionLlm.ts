import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './Usuario';

@Entity('retroalimentacion_llm')
export class RetroalimentacionLlm {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'usuario_id' })
  usuarioId!: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'tipo_retroalimentacion' })
  tipoRetroalimentacion!: string;

  @Column({ type: 'text', name: 'contenido_retroalimentacion' })
  contenidoRetroalimentacion!: string;

  @Column({ type: 'jsonb', nullable: true, name: 'contexto_original' })
  contextoOriginal?: any;

  @Column({ type: 'boolean', default: true, name: 'generado_por_llm' })
  generadoPorLlm!: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'fecha_generacion' })
  fechaGeneracion!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'modelo_llm_usado' })
  modeloLlmUsado!: string;

  // Relaciones
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;
}
