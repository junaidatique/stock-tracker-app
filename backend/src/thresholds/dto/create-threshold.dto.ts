import { IsIn, IsNumber, IsString, Min } from 'class-validator';

export class CreateThresholdDto {
  @IsString()
  ticker!: string;

  @IsNumber()
  @Min(0)
  target!: number;

  @IsIn(['above', 'below'])
  condition!: 'above' | 'below';
}
