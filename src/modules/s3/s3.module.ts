import { UploadController } from '@controllers/upload.controller';
import { Module } from '@nestjs/common';
import { S3Service } from '@services/s3/s3.service';

@Module({
  providers: [S3Service],
  exports: [S3Service],
  controllers: [UploadController],
})
export class S3Module {}
