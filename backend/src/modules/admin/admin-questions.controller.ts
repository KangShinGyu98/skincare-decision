import { Controller, Delete, Get, Patch, Post, Put } from '@nestjs/common';
import { Authenticated, Permissions } from '../../common/decorators/auth.decorator';
import {
  adminQuestionParamSchema,
  adminQuestionVariantParamSchema,
  adminQuestionsQuerySchema,
  type AdminQuestionParam,
  type AdminQuestionDetail,
  type AdminQuestionVariantParam,
  type CreateAdminQuestionBody,
  createAdminQuestionBodySchema,
  type CreateAdminQuestionResponse,
  type DeleteAdminQuestionResponse,
  type AdminQuestionsQuery,
  type AdminQuestionsResponse,
  type UpdateAdminQuestionBody,
  type UpdateAdminQuestionSortOrderBody,
  updateAdminQuestionSortOrderBodySchema,
  type UpdateAdminQuestionSortOrderResponse,
  type UpdateAdminQuestionStatusBody,
  updateAdminQuestionStatusBodySchema,
  type UpdateAdminQuestionStatusResponse,
  updateAdminQuestionBodySchema,
  type UpdateAdminQuestionResponse,
} from '@skincare-decision/shared/schemas';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod-body.decorator';
import { AdminQuestionsService } from './admin-questions.service';

@Controller('/admin/questions')
export class AdminQuestionsController {
  constructor(private readonly service: AdminQuestionsService) {}

  @Authenticated()
  @Get()
  findQuestions(
    @ZodQuery(adminQuestionsQuerySchema) query: AdminQuestionsQuery,
  ): Promise<AdminQuestionsResponse> {
    return this.service.findQuestions(query);
  }

  @Permissions('questions:manage:any')
  @Post()
  createQuestion(
    @ZodBody(createAdminQuestionBodySchema) body: CreateAdminQuestionBody,
  ): Promise<CreateAdminQuestionResponse> {
    return this.service.createQuestion(body);
  }

  @Permissions('questions:manage:any')
  @Patch('sort_order')
  updateSortOrder(
    @ZodBody(updateAdminQuestionSortOrderBodySchema) body: UpdateAdminQuestionSortOrderBody,
  ): Promise<UpdateAdminQuestionSortOrderResponse> {
    return this.service.updateSortOrder(body);
  }

  @Authenticated()
  @Get(':questionId')
  findQuestion(
    @ZodParam(adminQuestionParamSchema) params: AdminQuestionParam,
  ): Promise<AdminQuestionDetail> {
    return this.service.findQuestion(params.questionId);
  }

  @Permissions('questions:manage:any')
  @Patch(':questionVariantId/status')
  updateStatus(
    @ZodParam(adminQuestionVariantParamSchema) params: AdminQuestionVariantParam,
    @ZodBody(updateAdminQuestionStatusBodySchema) body: UpdateAdminQuestionStatusBody,
  ): Promise<UpdateAdminQuestionStatusResponse> {
    return this.service.updateStatus(params.questionVariantId, body);
  }

  @Permissions('questions:manage:any')
  @Put(':questionId')
  updateQuestion(
    @ZodParam(adminQuestionParamSchema) params: AdminQuestionParam,
    @ZodBody(updateAdminQuestionBodySchema) body: UpdateAdminQuestionBody,
  ): Promise<UpdateAdminQuestionResponse> {
    return this.service.updateQuestion(params.questionId, body);
  }

  @Permissions('questions:manage:any')
  @Delete(':questionId')
  deleteQuestion(
    @ZodParam(adminQuestionParamSchema) params: AdminQuestionParam,
  ): Promise<DeleteAdminQuestionResponse> {
    return this.service.deleteQuestion(params.questionId);
  }
}
