import { E_UserType } from '@entities/user/models/types';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'email', type: 'varchar' })
  email: string;

  @Column({ name: 'password', type: 'varchar' })
  password: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'phone', type: 'varchar' })
  phone: string;

  @Column({ name: 'foreign', type: 'boolean', default: false })
  foreign: boolean;

  @Column({
    name: 'role',
    type: 'enum',
    enum: E_UserType,
    // default: E_UserType.Buyer,
    nullable: true,
  })
  role: E_UserType | null;
}
