import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Modelo básico de Subtema para relaciones
 */
@Entity('subtemas')
export class Subtema {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'tema_id' })
  temaId!: number;

  @Column({ type: 'varchar', length: 255, name: 'nombre_subtema' })
  nombreSubtema!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;
}
