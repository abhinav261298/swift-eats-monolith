import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('menu_items')
@Index(['restaurantId'])
@Index(['restaurantId', 'isAvailable'])
@Index(['category'])
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column()
  category: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: true })
  isVegetarian: boolean;

  @Column({ default: false })
  isVegan: boolean;

  @Column({ default: false })
  isGlutenFree: boolean;

  @Column('simple-array', { nullable: true })
  allergens: string[];

  @Column({ default: 0 })
  preparationTime: number; // in minutes

  @Column()
  restaurantId: string;

  @ManyToOne(() => Restaurant, restaurant => restaurant.menuItems)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
