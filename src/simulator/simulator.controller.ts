import { Controller, Post, Body, Get } from '@nestjs/common';
import { SimulatorService } from './simulator.service';

@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post('start')
  async startSimulator(@Body() body: { orderId?: string; drivers?: number; eps?: number }) {
    return this.simulatorService.startDriverSimulation(body.orderId, body.drivers, body.eps);
  }

  @Post('stop')
  async stopSimulator() {
    return this.simulatorService.stopDriverSimulation();
  }

  @Get('status')
  async getStatus() {
    return this.simulatorService.getSimulatorStatus();
  }
}
