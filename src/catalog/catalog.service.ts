import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from './entities/menu-item.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
    @Inject('REDIS_CLIENT')
    private redis: Redis,
  ) {}

  async findAllRestaurants(): Promise<Restaurant[]> {
    return this.restaurantRepository.find({
      where: { isActive: true },
      relations: ['menuItems'],
    });
  }

  async findRestaurantsByCity(city?: string): Promise<Restaurant[]> {
    const query = this.restaurantRepository
      .createQueryBuilder('restaurant')
      .where('restaurant.isActive = :isActive', { isActive: true });

    if (city) {
      query.andWhere('LOWER(restaurant.city) = LOWER(:city)', { city });
    }

    return query.getMany();
  }

  async findRestaurantById(id: string): Promise<Restaurant | null> {
    return this.restaurantRepository.findOne({
      where: { id, isActive: true },
    });
  }

  async findRestaurantsByLocation(latitude: number, longitude: number, radius: number = 10): Promise<Restaurant[]> {
    // Simple distance calculation - in production, use PostGIS or similar
    return this.restaurantRepository
      .createQueryBuilder('restaurant')
      .where('restaurant.isActive = :isActive', { isActive: true })
      .andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(restaurant.latitude)) * cos(radians(restaurant.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(restaurant.latitude)))) <= :radius`,
        { lat: latitude, lng: longitude, radius }
      )
      .leftJoinAndSelect('restaurant.menuItems', 'menuItems')
      .getMany();
  }

  async findMenuByRestaurantId(restaurantId: string): Promise<MenuItem[]> {
    const cacheKey = `catalog:restaurant:${restaurantId}`;
    
    try {
      // Try to get from Redis cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache read failed:', error);
    }

    // Fallback to database
    const menuItems = await this.menuItemRepository.find({
      where: { 
        restaurantId, 
        isAvailable: true 
      },
      order: { category: 'ASC', name: 'ASC' }
    });

    // Warm cache with TTL and jitter
    try {
      const ttl = 300; // 5 minutes base TTL
      const jitter = Math.floor(Math.random() * 30); // 0-30 seconds jitter
      const finalTtl = ttl + jitter;
      
      await this.redis.setex(cacheKey, finalTtl, JSON.stringify(menuItems));
    } catch (error) {
      console.warn('Redis cache write failed:', error);
    }

    return menuItems;
  }

  async invalidateMenuCache(restaurantId: string): Promise<void> {
    const cacheKey = `catalog:restaurant:${restaurantId}`;
    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      console.warn('Redis cache invalidation failed:', error);
    }
  }

  async updateMenuItemStatus(id: string, isAvailable: boolean): Promise<MenuItem | null> {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });
    if (!menuItem) return null;

    menuItem.isAvailable = isAvailable;
    await this.menuItemRepository.save(menuItem);

    // Invalidate cache
    await this.invalidateMenuCache(menuItem.restaurantId);

    return menuItem;
  }

  async updateRestaurantStatus(id: string, isActive: boolean): Promise<Restaurant | null> {
    const restaurant = await this.restaurantRepository.findOne({ where: { id } });
    if (!restaurant) return null;

    restaurant.isActive = isActive;
    await this.restaurantRepository.save(restaurant);

    // Invalidate cache
    await this.invalidateMenuCache(id);

    return restaurant;
  }

  async searchMenuItems(query: string): Promise<MenuItem[]> {
    return this.menuItemRepository
      .createQueryBuilder('menuItem')
      .leftJoinAndSelect('menuItem.restaurant', 'restaurant')
      .where('menuItem.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('restaurant.isActive = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(menuItem.name) LIKE LOWER(:query) OR LOWER(menuItem.description) LIKE LOWER(:query) OR LOWER(menuItem.category) LIKE LOWER(:query))',
        { query: `%${query}%` }
      )
      .getMany();
  }
}
