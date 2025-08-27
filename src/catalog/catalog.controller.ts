import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Restaurant } from './entities/restaurant.entity';
import { MenuItem } from './entities/menu-item.entity';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('restaurants')
  async findRestaurants(@Query('city') city?: string): Promise<Restaurant[]> {
    return this.catalogService.findRestaurantsByCity(city);
  }

  @Get('restaurants/:id')
  async findRestaurantById(@Param('id') id: string): Promise<Restaurant> {
    return this.catalogService.findRestaurantById(id);
  }

  @Get('restaurants/:id/menu')
  async findRestaurantMenu(@Param('id') restaurantId: string): Promise<MenuItem[]> {
    return this.catalogService.findMenuByRestaurantId(restaurantId);
  }

  @Get('restaurants/location/:lat/:lng')
  async findRestaurantsByLocation(
    @Param('lat') latitude: string,
    @Param('lng') longitude: string,
    @Query('radius') radius?: string,
  ): Promise<Restaurant[]> {
    return this.catalogService.findRestaurantsByLocation(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 10,
    );
  }


  @Get('menu/search')
  async searchMenuItems(@Query('q') query: string): Promise<MenuItem[]> {
    return this.catalogService.searchMenuItems(query);
  }
}
