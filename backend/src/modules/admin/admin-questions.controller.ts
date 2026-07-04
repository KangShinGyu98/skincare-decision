import { Controller, Get, Patch } from '@nestjs/common';
import {
  adminQuestionParamSchema,
  adminQuestionsQuerySchema,
  updateAdminQuestionStatusBodySchema,
  type AdminQuestionParam,
  type AdminQuestionsQuery,
  type AdminQuestionsResponse,
  type UpdateAdminQuestionStatusBody,
  type UpdateAdminQuestionStatusResponse,
} from '@skincare-decision/shared/schemas';
import { Permissions } from '../../common/decorators/auth.decorator';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod-body.decorator';
import { AdminQuestionsService } from './admin-questions.service';

@Permissions('questions:manage:any')
@Controller('/admin/questions')
export class AdminQuestionsController {
  constructor(private readonly service: AdminQuestionsService) {}

  @Get()
  findQuestions(
    @ZodQuery(adminQuestionsQuerySchema) query: AdminQuestionsQuery,
  ): Promise<AdminQuestionsResponse> {
    return this.service.findQuestions(query);
  }

  @Patch(':questionVariantId/status')
  updateStatus(
    @ZodParam(adminQuestionParamSchema) params: AdminQuestionParam,
    @ZodBody(updateAdminQuestionStatusBodySchema) body: UpdateAdminQuestionStatusBody,
  ): Promise<UpdateAdminQuestionStatusResponse> {
    return this.service.updateStatus(params.questionVariantId, body);
  }
}
