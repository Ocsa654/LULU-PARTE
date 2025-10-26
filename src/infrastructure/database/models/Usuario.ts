import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Modelo básico de Usuario para relaciones
 * Solo incluye campos necesarios para LULU
 */
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apellido!: string;

  @Column({ type: 'varchar', length: 50 })
  rol!: string;
}
