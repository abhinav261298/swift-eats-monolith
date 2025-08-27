import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DriverLocationDocument = DriverLocation & Document;

@Schema({
  timestamps: true,
  collection: 'driver_locations',
})
export class DriverLocation {
  @Prop({ required: true, index: true })
  driverId: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true, type: Number })
  latitude: number;

  @Prop({ required: true, type: Number })
  longitude: number;

  @Prop({ type: Number })
  accuracy?: number;

  @Prop({ type: Number })
  speed?: number;

  @Prop({ type: Number })
  heading?: number;

  @Prop({ type: String })
  orderId?: string;

  @Prop({ type: Date, default: Date.now, expires: 172800 }) // 48 hours TTL
  expiresAt: Date;
}

export const DriverLocationSchema = SchemaFactory.createForClass(DriverLocation);

// Create compound index for efficient queries
DriverLocationSchema.index({ driverId: 1, timestamp: -1 });
DriverLocationSchema.index({ orderId: 1, timestamp: -1 });
DriverLocationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
