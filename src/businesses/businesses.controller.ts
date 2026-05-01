import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BusinessUserRole } from '../common/enums';
import { UsersService } from '../users/users.service';
import { AddMemberDto, CreateBusinessDto } from './dto';
import { BusinessesService } from './businesses.service';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async create(@CurrentUser() jwt: JwtPayload, @Body() dto: CreateBusinessDto) {
    const user = await this.usersService.ensureFromJwt(jwt);
    return this.businesses.createForUser(user.id, dto);
  }

  @Get('mine')
  async mine(@CurrentUser() jwt: JwtPayload) {
    const user = await this.usersService.ensureFromJwt(jwt);
    return this.businesses.listForUser(user.id);
  }

  @Get(':id')
  async getOne(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = await this.usersService.ensureFromJwt(jwt);
    return this.businesses.getForMember(user.id, id);
  }

  @Post(':id/members')
  async addMember(
    @CurrentUser() jwt: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ) {
    const user = await this.usersService.ensureFromJwt(jwt);
    return this.businesses.addMember(
      user.id,
      id,
      dto.userId,
      dto.role as BusinessUserRole,
    );
  }
}
