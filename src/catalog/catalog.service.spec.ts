import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogService } from './catalog.service';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from './entities/menu-item.entity';

describe('CatalogService', () => {
  let service: CatalogService;
  let restaurantRepository: Repository<Restaurant>;
  let menuItemRepository: Repository<MenuItem>;
  let mockRedis: any;

  const mockRestaurant = {
    id: '1',
    name: 'Test Restaurant',
    city: 'Mumbai',
    isActive: true,
  };

  const mockMenuItems = [
    {
      id: '1',
      name: 'Pizza',
      restaurantId: '1',
      isAvailable: true,
      category: 'Main',
    },
    {
      id: '2',
      name: 'Burger',
      restaurantId: '1',
      isAvailable: true,
      category: 'Main',
    },
  ];

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: getRepositoryToken(Restaurant),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MenuItem),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    restaurantRepository = module.get<Repository<Restaurant>>(getRepositoryToken(Restaurant));
    menuItemRepository = module.get<Repository<MenuItem>>(getRepositoryToken(MenuItem));
  });

  describe('findMenuByRestaurantId', () => {
    it('should return cached menu items when cache hit', async () => {
      const restaurantId = '1';
      const cachedData = JSON.stringify(mockMenuItems);
      
      mockRedis.get.mockResolvedValue(cachedData);

      const result = await service.findMenuByRestaurantId(restaurantId);

      expect(mockRedis.get).toHaveBeenCalledWith(`catalog:restaurant:${restaurantId}`);
      expect(result).toEqual(mockMenuItems);
      expect(menuItemRepository.find).not.toHaveBeenCalled();
    });

    it('should fallback to database and warm cache when cache miss', async () => {
      const restaurantId = '1';
      
      mockRedis.get.mockResolvedValue(null);
      jest.spyOn(menuItemRepository, 'find').mockResolvedValue(mockMenuItems as MenuItem[]);

      const result = await service.findMenuByRestaurantId(restaurantId);

      expect(mockRedis.get).toHaveBeenCalledWith(`catalog:restaurant:${restaurantId}`);
      expect(menuItemRepository.find).toHaveBeenCalledWith({
        where: { restaurantId, isAvailable: true },
        order: { category: 'ASC', name: 'ASC' }
      });
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `catalog:restaurant:${restaurantId}`,
        expect.any(Number), // TTL with jitter
        JSON.stringify(mockMenuItems)
      );
      expect(result).toEqual(mockMenuItems);
    });

    it('should handle Redis cache read failure gracefully', async () => {
      const restaurantId = '1';
      
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      jest.spyOn(menuItemRepository, 'find').mockResolvedValue(mockMenuItems as MenuItem[]);
      mockRedis.setex.mockResolvedValue('OK');

      // Suppress console.warn for this test
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.findMenuByRestaurantId(restaurantId);

      expect(menuItemRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockMenuItems);
      expect(consoleSpy).toHaveBeenCalledWith('Redis cache read failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle Redis cache write failure gracefully', async () => {
      const restaurantId = '1';
      
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));
      jest.spyOn(menuItemRepository, 'find').mockResolvedValue(mockMenuItems as MenuItem[]);

      // Suppress console.warn for this test
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.findMenuByRestaurantId(restaurantId);

      expect(result).toEqual(mockMenuItems);
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Redis cache write failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('findRestaurantsByCity', () => {
    it('should find restaurants by city', async () => {
      const city = 'Mumbai';
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRestaurant]),
      };

      jest.spyOn(restaurantRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findRestaurantsByCity(city);

      expect(restaurantRepository.createQueryBuilder).toHaveBeenCalledWith('restaurant');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('restaurant.isActive = :isActive', { isActive: true });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('LOWER(restaurant.city) = LOWER(:city)', { city });
      expect(result).toEqual([mockRestaurant]);
    });

    it('should find all active restaurants when no city provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRestaurant]),
      };

      jest.spyOn(restaurantRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findRestaurantsByCity();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('restaurant.isActive = :isActive', { isActive: true });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual([mockRestaurant]);
    });
  });

  describe('invalidateMenuCache', () => {
    it('should delete cache key', async () => {
      const restaurantId = '1';

      await service.invalidateMenuCache(restaurantId);

      expect(mockRedis.del).toHaveBeenCalledWith(`catalog:restaurant:${restaurantId}`);
    });

    it('should handle Redis delete failure gracefully', async () => {
      const restaurantId = '1';
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'));

      // Suppress console.warn for this test
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.invalidateMenuCache(restaurantId);

      expect(mockRedis.del).toHaveBeenCalledWith(`catalog:restaurant:${restaurantId}`);
      expect(consoleSpy).toHaveBeenCalledWith('Redis cache invalidation failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('updateMenuItemStatus', () => {
    it('should update menu item status and invalidate cache', async () => {
      const menuItem = { id: '1', restaurantId: '1', isAvailable: false };
      
      jest.spyOn(menuItemRepository, 'findOne').mockResolvedValue(menuItem as MenuItem);
      jest.spyOn(menuItemRepository, 'save').mockResolvedValue(menuItem as MenuItem);

      const result = await service.updateMenuItemStatus('1', true);

      expect(menuItemRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(menuItem.isAvailable).toBe(true);
      expect(menuItemRepository.save).toHaveBeenCalledWith(menuItem);
      expect(mockRedis.del).toHaveBeenCalledWith('catalog:restaurant:1');
      expect(result).toEqual(menuItem);
    });

    it('should return null when menu item not found', async () => {
      jest.spyOn(menuItemRepository, 'findOne').mockResolvedValue(null);

      const result = await service.updateMenuItemStatus('nonexistent', true);

      expect(result).toBeNull();
      expect(menuItemRepository.save).not.toHaveBeenCalled();
    });
  });
});
