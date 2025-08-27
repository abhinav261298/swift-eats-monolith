import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { MenuItem } from './menu-item.entity';

@Entity('restaurants')
@Index(['isActive'])
@Index(['latitude', 'longitude'])
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  @Index()
  city: string;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  ownerId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  totalReviews: number;

  @Column('simple-array', { nullable: true })
  cuisineTypes: string[];

  @Column('time', { nullable: true })
  openingTime: string;

  @Column('time', { nullable: true })
  closingTime: string;

  @OneToMany(() => MenuItem, menuItem => menuItem.restaurant)
  menuItems: MenuItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
