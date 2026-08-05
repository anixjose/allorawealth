import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InvestmentCompaniesService } from './investment-companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Controller('investment-companies')
@UseGuards(JwtAuthGuard)
export class InvestmentCompaniesController {
  constructor(private readonly companiesService: InvestmentCompaniesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('INVESTMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findById(id);
  }
}
