import { IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GpsLocationDto {
  @IsString()
  driverId: string;

  @IsNumber()
  ts: number; // Unix timestamp

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;
}

export class IngestTelemetryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpsLocationDto)
  locations: GpsLocationDto[];
}
