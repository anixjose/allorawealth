import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InvestmentOpportunitiesService } from './investment-opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';

@Controller('investment-opportunities')
@UseGuards(JwtAuthGuard)
export class InvestmentOpportunitiesController {
  constructor(private readonly opportunitiesService: InvestmentOpportunitiesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('INVESTMENT_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.opportunitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findById(id);
  }
}
