import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TelemetryDocument = Telemetry & Document;

@Schema({ timestamps: true })
export class Telemetry {
  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true })
  source: string; // 'api', 'web', 'mobile'

  @Prop({ type: Object })
  data: Record<string, any>;

  @Prop()
  userId?: string;

  @Prop()
  sessionId?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const TelemetrySchema = SchemaFactory.createForClass(Telemetry);
