import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

/** Creating, editing, and deleting internal staff identities stays an ADMIN/SUPER_ADMIN-only action — not delegable to custom User Categories or any other fixed role. */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateStaffUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.createStaffUser(dto, { roles: user.roles });
  }

  @Get()
  findAll() {
    return this.usersService.findAllStaff();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.updateStaffUser(id, dto, { id: user.id, roles: user.roles });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deleteStaffUser(id, { id: user.id, roles: user.roles });
  }
}
