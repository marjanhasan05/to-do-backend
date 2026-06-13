import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class RemovePushSubscriptionDto {
  @ApiProperty()
  @IsString()
  @IsUrl({
    require_tld: false,
  })
  endpoint: string;
}
