import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BusinessUserRole } from '../common/enums';
import { UsersService } from '../users/users.service';
import { CreateEquipmentDto, RegisterImageDto, SasUploadQueryDto, UpdateEquipmentDto } from './dto';
import { EquipmentService } from './equipment.service';

@Controller('equipment')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(
    private readonly equipment: EquipmentService,
    private readonly users: UsersService,
  ) {}

  @Post()
  async create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateEquipmentDto) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.equipment.create(user.id, dto);
  }

  @Get(':id')
  async getOne(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.users.ensureFromJwt(jwt);
    return this.equipment.getPublic(id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.equipment.update(user.id, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    await this.equipment.softDelete(user.id, id);
    return { ok: true };
  }

  @Post(':id/images/sas')
  async imageUploadSas(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SasUploadQueryDto,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.equipment.createImageUploadSas(
      user.id,
      id,
      query.extension,
      BusinessUserRole.Manager,
    );
  }

  @Post(':id/images')
  async registerImage(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterImageDto,
  ) {
    const user = await this.users.ensureFromJwt(jwt);
    return this.equipment.registerImage(
      user.id,
      id,
      dto.blobPath,
      dto.sortOrder ?? 0,
      BusinessUserRole.Manager,
    );
  }
}
