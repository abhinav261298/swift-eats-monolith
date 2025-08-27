import { Injectable } from '@nestjs/common';

interface DriverData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'available' | 'busy' | 'offline';
  orderId?: string;
}

@Injectable()
export class SimulatorService {
  private isRunning = false;
  private currentOrderId: string | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;
  private drivers: DriverData[] = [];
  private driverCount = 50;
  private eventsPerSecond = 10;

  async startDriverSimulation(orderId?: string, drivers = 50, eps = 10) {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Simulator is already running',
        status: 'running',
        orderId: this.currentOrderId,
        activeDrivers: this.drivers.length
      };
    }

    this.isRunning = true;
    this.currentOrderId = orderId || null;
    this.driverCount = drivers;
    this.eventsPerSecond = eps;

    // Initialize drivers
    this.initializeDrivers();

    // Start GPS simulation - 10 events per second means 100ms intervals
    const intervalMs = 1000 / this.eventsPerSecond;
    this.simulationInterval = setInterval(() => {
      this.simulateDriverMovement();
    }, intervalMs);

    console.log(`🚗 Started simulation with ${this.driverCount} drivers at ${this.eventsPerSecond} events/sec`);

    return {
      success: true,
      message: `Driver simulator started with ${this.driverCount} drivers at ${this.eventsPerSecond} events/sec`,
      status: 'running',
      orderId: this.currentOrderId,
      activeDrivers: this.drivers.length,
      eventsPerSecond: this.eventsPerSecond
    };
  }

  private initializeDrivers() {
    this.drivers = [];
    for (let i = 1; i <= this.driverCount; i++) {
      this.drivers.push({
        id: `driver-${i.toString().padStart(3, '0')}`,
        name: `Driver ${i}`,
        lat: 12.9716 + (Math.random() - 0.5) * 0.1, // Spread around Bangalore
        lng: 77.5946 + (Math.random() - 0.5) * 0.1,
        status: Math.random() > 0.3 ? 'available' : 'busy'
      });
    }
  }

  async stopDriverSimulation() {
    if (!this.isRunning) {
      return {
        success: false,
        message: 'Simulator is not running',
        status: 'stopped'
      };
    }

    this.isRunning = false;
    this.currentOrderId = null;
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    return {
      success: true,
      message: 'Driver simulator stopped successfully',
      status: 'stopped'
    };
  }

  async getSimulatorStatus() {
    return {
      isRunning: this.isRunning,
      status: this.isRunning ? 'running' : 'stopped',
      orderId: this.currentOrderId,
      activeDrivers: this.drivers.length,
      eventsPerSecond: this.eventsPerSecond,
      availableDrivers: this.drivers.filter(d => d.status === 'available').length,
      busyDrivers: this.drivers.filter(d => d.status === 'busy').length,
      uptime: this.isRunning ? Date.now() : null
    };
  }

  private simulateDriverMovement() {
    // Update random drivers each cycle for load testing
    const driversToUpdate = Math.min(this.eventsPerSecond, this.drivers.length);
    
    for (let i = 0; i < driversToUpdate; i++) {
      const randomDriver = this.drivers[Math.floor(Math.random() * this.drivers.length)];
      
      // Simulate movement (small increments)
      randomDriver.lat += (Math.random() - 0.5) * 0.001;
      randomDriver.lng += (Math.random() - 0.5) * 0.001;
      
      // Occasionally change status
      if (Math.random() < 0.1) {
        randomDriver.status = Math.random() > 0.5 ? 'available' : 'busy';
      }
      
      // Log every 10th update to avoid spam
      if (i % 10 === 0) {
        console.log(`🚗 ${randomDriver.id} GPS: ${randomDriver.lat.toFixed(6)}, ${randomDriver.lng.toFixed(6)} [${randomDriver.status}]`);
      }
    }
    
    // Log performance metrics every 100 cycles
    if (Math.random() < 0.01) {
      console.log(`📊 Load Test: ${this.drivers.length} drivers, ${this.eventsPerSecond} events/sec, ${this.drivers.filter(d => d.status === 'available').length} available`);
    }
  }
}
