import { Controller, Get, Post } from '@nestjs/common';
import {
  catParamSchema,
  createCatBodySchema,
  listCatsQuerySchema,
  type CatParamDto,
  type CreateCatBodyDto,
  type ListCatsQueryDto,
} from '@skincare-decision/shared/schemas';
import { ZodBody, ZodParam, ZodQuery } from 'src/common/decorators/zod-body.decorator';

@Controller('cats')
export class CatsController {
  @Post()
  create(@ZodBody(createCatBodySchema) body: CreateCatBodyDto) {
    return {
      created: true,
      cat: body,
    };
  }

  @Get()
  list(@ZodQuery(listCatsQuerySchema) query: ListCatsQueryDto) {
    return {
      page: query.page,
      limit: query.limit,
      items: [],
    };
  }

  @Get(':catId')
  findOne(@ZodParam(catParamSchema) params: CatParamDto) {
    return {
      catId: params.catId,
      name: 'test cat',
    };
  }
}
