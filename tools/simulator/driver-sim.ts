#!/usr/bin/env ts-node

import { Command } from 'commander';
import axios from 'axios';
import Redis from 'ioredis';

interface BoundingBox {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface DriverLocation {
  driverId: string;
  ts: number;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface VirtualDriver {
  id: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number; // km/h
  lastUpdate: number;
}

class DriverSimulator {
  private drivers: VirtualDriver[] = [];
  private bbox: BoundingBox;
  private eventsPerSecond: number;
  private mode: 'http' | 'stream';
  private redis?: Redis;
  private apiUrl: string;
  private isRunning = false;
  private eventCount = 0;
  private startTime = 0;

  // Bounding boxes for cities
  private boundingBoxes: Record<string, BoundingBox> = {
    mumbai: {
      name: 'Mumbai',
      minLat: 18.8900,
      maxLat: 19.2700,
      minLng: 72.7700,
      maxLng: 73.0300,
    },
    pune: {
      name: 'Pune',
      minLat: 18.4000,
      maxLat: 18.6500,
      minLng: 73.6988,
      maxLng: 73.9500,
    },
  };

  constructor(
    driverCount: number,
    eventsPerSecond: number,
    mode: 'http' | 'stream',
    bboxName: string,
    apiUrl: string = 'http://localhost:6988'
  ) {
    this.eventsPerSecond = eventsPerSecond;
    this.mode = mode;
    this.apiUrl = apiUrl;

    if (!this.boundingBoxes[bboxName]) {
      throw new Error(`Unknown bounding box: ${bboxName}. Available: ${Object.keys(this.boundingBoxes).join(', ')}`);
    }
    this.bbox = this.boundingBoxes[bboxName];

    // Initialize Redis for stream mode
    if (mode === 'stream') {
      this.redis = new Redis({
        host: 'localhost',
        port: 6380,
        maxRetriesPerRequest: 3,
      });
    }

    // Create virtual drivers
    this.initializeDrivers(driverCount);
  }

  private initializeDrivers(count: number): void {
    console.log(`🚗 Initializing ${count} virtual drivers in ${this.bbox.name}...`);
    
    for (let i = 0; i < count; i++) {
      const driver: VirtualDriver = {
        id: `driver_${i.toString().padStart(3, '0')}`,
        lat: this.randomInRange(this.bbox.minLat, this.bbox.maxLat),
        lng: this.randomInRange(this.bbox.minLng, this.bbox.maxLng),
        heading: Math.random() * 360,
        speed: this.randomInRange(20, 60), // 20-60 km/h
        lastUpdate: Date.now(),
      };
      this.drivers.push(driver);
    }

    console.log(`✅ Created ${this.drivers.length} drivers`);
  }

  private randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private moveDriver(driver: VirtualDriver): void {
    const now = Date.now();
    const timeDelta = (now - driver.lastUpdate) / 1000; // seconds
    
    // Convert speed from km/h to degrees per second (rough approximation)
    const speedInDegreesPerSecond = (driver.speed / 3600) * (1 / 111); // 1 degree ≈ 111 km
    
    // Calculate new position
    const distance = speedInDegreesPerSecond * timeDelta;
    const headingRad = (driver.heading * Math.PI) / 180;
    
    let newLat = driver.lat + distance * Math.cos(headingRad);
    let newLng = driver.lng + distance * Math.sin(headingRad);
    
    // Bounce off boundaries
    if (newLat < this.bbox.minLat || newLat > this.bbox.maxLat) {
      driver.heading = 360 - driver.heading;
      newLat = Math.max(this.bbox.minLat, Math.min(this.bbox.maxLat, newLat));
    }
    
    if (newLng < this.bbox.minLng || newLng > this.bbox.maxLng) {
      driver.heading = 180 - driver.heading;
      newLng = Math.max(this.bbox.minLng, Math.min(this.bbox.maxLng, newLng));
    }
    
    // Add some randomness to movement
    driver.heading += this.randomInRange(-10, 10);
    driver.speed += this.randomInRange(-5, 5);
    driver.speed = Math.max(10, Math.min(80, driver.speed)); // Keep speed between 10-80 km/h
    
    driver.lat = newLat;
    driver.lng = newLng;
    driver.lastUpdate = now;
  }

  private generateLocationEvent(driver: VirtualDriver): DriverLocation {
    return {
      driverId: driver.id,
      ts: Date.now(),
      lat: Math.round(driver.lat * 1000000) / 1000000, // 6 decimal places
      lng: Math.round(driver.lng * 1000000) / 1000000,
      accuracy: this.randomInRange(3, 15),
      speed: Math.round(driver.speed),
      heading: Math.round(driver.heading),
    };
  }

  private async sendHttpBatch(events: DriverLocation[]): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/api/v1/telemetry/ingest`, {
        locations: events,
      });
      this.eventCount += events.length;
    } catch (error) {
      console.error('❌ HTTP batch failed:', error.message);
    }
  }

  private async sendStreamEvent(event: DriverLocation): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.xadd(
        'gps:ingest',
        '*',
        'driverId', event.driverId,
        'ts', event.ts.toString(),
        'lat', event.lat.toString(),
        'lng', event.lng.toString(),
        'accuracy', (event.accuracy || '').toString(),
        'speed', (event.speed || '').toString(),
        'heading', (event.heading || '').toString(),
        'ingestedAt', Date.now().toString()
      );
      this.eventCount++;
    } catch (error) {
      console.error('❌ Stream event failed:', error.message);
    }
  }

  private logStats(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const effectiveRate = this.eventCount / elapsed;
    
    console.log(`📊 Stats: ${this.eventCount} events in ${elapsed.toFixed(1)}s | Rate: ${effectiveRate.toFixed(2)} events/sec | Target: ${this.eventsPerSecond} events/sec`);
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting driver simulator...`);
    console.log(`📍 Area: ${this.bbox.name}`);
    console.log(`🚗 Drivers: ${this.drivers.length}`);
    console.log(`⚡ Target rate: ${this.eventsPerSecond} events/sec`);
    console.log(`🔄 Mode: ${this.mode}`);
    console.log(`🌐 API URL: ${this.apiUrl}`);
    console.log('');

    this.isRunning = true;
    this.startTime = Date.now();
    
    // Stats logging interval
    const statsInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(statsInterval);
        return;
      }
      this.logStats();
    }, 5000);

    // Main simulation loop
    const intervalMs = 1000 / this.eventsPerSecond;
    let eventBatch: DriverLocation[] = [];
    
    while (this.isRunning) {
      // Select random driver and move them
      const driver = this.drivers[Math.floor(Math.random() * this.drivers.length)];
      this.moveDriver(driver);
      
      // Generate location event
      const event = this.generateLocationEvent(driver);
      
      if (this.mode === 'http') {
        eventBatch.push(event);
        
        // Send batch when it reaches size limit
        if (eventBatch.length >= this.randomInRange(10, 50)) {
          await this.sendHttpBatch(eventBatch);
          eventBatch = [];
        }
      } else {
        await this.sendStreamEvent(event);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    // Send remaining batch
    if (this.mode === 'http' && eventBatch.length > 0) {
      await this.sendHttpBatch(eventBatch);
    }

    clearInterval(statsInterval);
    this.logStats();
    console.log('🛑 Simulation stopped');
  }

  stop(): void {
    this.isRunning = false;
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

// CLI setup
const program = new Command();

program
  .name('driver-sim')
  .description('GPS Driver Simulator for Swift Eats')
  .version('1.0.0')
  .option('--drivers <number>', 'Number of virtual drivers', '50')
  .option('--eps <number>', 'Events per second', '10')
  .option('--mode <mode>', 'Delivery mode: http or stream', 'http')
  .option('--bbox <city>', 'Bounding box: mumbai or pune', 'mumbai')
  .option('--api-url <url>', 'API base URL', 'http://localhost:3002')
  .parse();

const options = program.opts();

// Validate options
const drivers = parseInt(options.drivers);
const eps = parseFloat(options.eps);
const mode = options.mode;
const bbox = options.bbox;
const apiUrl = options.apiUrl;

if (isNaN(drivers) || drivers <= 0) {
  console.error('❌ Invalid drivers count');
  process.exit(1);
}

if (isNaN(eps) || eps <= 0) {
  console.error('❌ Invalid events per second');
  process.exit(1);
}

if (!['http', 'stream'].includes(mode)) {
  console.error('❌ Mode must be "http" or "stream"');
  process.exit(1);
}

if (!['mumbai', 'pune'].includes(bbox)) {
  console.error('❌ Bbox must be "mumbai" or "pune"');
  process.exit(1);
}

// Start simulation
const simulator = new DriverSimulator(drivers, eps, mode, bbox, apiUrl);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping simulation...');
  simulator.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping simulation...');
  simulator.stop();
  process.exit(0);
});

// Start the simulation
simulator.start().catch((error) => {
  console.error('❌ Simulation failed:', error.message);
  process.exit(1);
});
