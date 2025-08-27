import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Module, Controller, Get, Post, Body, Param, Query, Injectable } from '@nestjs/common';

// Mock Controllers
@Controller('catalog')
class MockCatalogController {
  @Get('restaurants')
  async findAllRestaurants() {
    return [
      {
        id: '1',
        name: 'Pizza Palace',
        description: 'Best pizza in town',
        address: '123 Main St',
        latitude: 40.7128,
        longitude: -74.0060,
        phone: '+1234567890',
        email: 'info@pizzapalace.com',
        isActive: true,
        rating: 4.5,
        totalReviews: 150,
        cuisineTypes: ['Italian', 'Pizza'],
        openingTime: '10:00',
        closingTime: '22:00',
        menuItems: []
      },
      {
        id: '2',
        name: 'Burger Barn',
        description: 'Gourmet burgers and fries',
        address: '456 Oak Ave',
        latitude: 40.7589,
        longitude: -73.9851,
        phone: '+1234567891',
        email: 'info@burgerbarn.com',
        isActive: true,
        rating: 4.2,
        totalReviews: 89,
        cuisineTypes: ['American', 'Burgers'],
        openingTime: '11:00',
        closingTime: '23:00',
        menuItems: []
      }
    ];
  }

  @Get('restaurants/:id')
  async findRestaurantById(@Param('id') id: string) {
    return {
      id,
      name: 'Pizza Palace',
      description: 'Best pizza in town',
      address: '123 Main St',
      latitude: 40.7128,
      longitude: -74.0060,
      phone: '+1234567890',
      email: 'info@pizzapalace.com',
      isActive: true,
      rating: 4.5,
      totalReviews: 150,
      cuisineTypes: ['Italian', 'Pizza'],
      openingTime: '10:00',
      closingTime: '22:00',
      menuItems: []
    };
  }

  @Get('restaurants/:id/menu')
  async findMenuItemsByRestaurant(@Param('id') restaurantId: string) {
    return [
      {
        id: '1',
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato and mozzarella',
        price: 12.99,
        category: 'Pizza',
        isAvailable: true,
        isVegetarian: true,
        preparationTime: 15,
        restaurantId
      },
      {
        id: '2',
        name: 'Pepperoni Pizza',
        description: 'Pizza with pepperoni and cheese',
        price: 14.99,
        category: 'Pizza',
        isAvailable: true,
        isVegetarian: false,
        preparationTime: 15,
        restaurantId
      }
    ];
  }

  @Get('menu/search')
  async searchMenuItems(@Query('q') query: string) {
    return [
      {
        id: '1',
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato and mozzarella',
        price: 12.99,
        category: 'Pizza',
        isAvailable: true,
        isVegetarian: true,
        preparationTime: 15
      }
    ];
  }
}

@Controller('auth')
class MockAuthController {
  @Post('register')
  async register(@Body() dto: any) {
    return {
      accessToken: 'mock-jwt-token-' + Date.now(),
      user: {
        id: '1',
        email: dto.email || 'user@example.com',
        firstName: dto.firstName || 'John',
        lastName: dto.lastName || 'Doe',
        role: 'customer'
      }
    };
  }

  @Post('login')
  async login(@Body() dto: any) {
    return {
      accessToken: 'mock-jwt-token-' + Date.now(),
      user: {
        id: '1',
        email: dto.email || 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer'
      }
    };
  }

  @Get('profile')
  async getProfile() {
    return {
      id: '1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer'
    };
  }
}

@Module({
  controllers: [MockCatalogController, MockAuthController],
})
class DevAppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    DevAppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Swift Eats DEV API is running on: http://localhost:${port}/api/v1`);
  console.log('📊 Environment: development (mock mode)');
  console.log(`🔗 Test endpoint: http://localhost:${port}/api/v1/catalog/restaurants`);
}

bootstrap().catch((error) => {
  console.error('Failed to start development server:', error);
  process.exit(1);
});
