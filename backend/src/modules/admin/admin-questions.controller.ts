import { Controller, Delete, Get, Post, Put } from '@nestjs/common';
import {
  adminQuestionParamSchema,
  adminQuestionsQuerySchema,
  type AdminQuestionParam,
  type AdminQuestionDetail,
  type CreateAdminQuestionBody,
  createAdminQuestionBodySchema,
  type CreateAdminQuestionResponse,
  type DeleteAdminQuestionResponse,
  type AdminQuestionsQuery,
  type AdminQuestionsResponse,
  type UpdateAdminQuestionBody,
  updateAdminQuestionBodySchema,
  type UpdateAdminQuestionResponse,
} from '@skincare-decision/shared/schemas';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod-body.decorator';
import { AdminQuestionsService } from './admin-questions.service';

@Controller('/admin/questions')
export class AdminQuestionsController {
  constructor(private readonly service: AdminQuestionsService) {}

  @Get()
  findQuestions(
    @ZodQuery(adminQuestionsQuerySchema) query: AdminQuestionsQuery,
  ): Promise<AdminQuestionsResponse> {
    return this.service.findQuestions(query);
  }

  @Post()
  createQuestion(
    @ZodBody(createAdminQuestionBodySchema) body: CreateAdminQuestionBody,
  ): Promise<CreateAdminQuestionResponse> {
    return this.service.createQuestion(body);
  }

  @Get(':questionId')
  findQuestion(
    @ZodParam(adminQuestionParamSchema) params: AdminQuestionParam,
  ): Promise<AdminQuestionDetail> {
    return this.service.findQuestion(params.questionId);
  }

  @Put(':questionId')
  updateQuestion(
    @ZodParam(adminQuestionParamSchema) params: AdminQuestionParam,
    @ZodBody(updateAdminQuestionBodySchema) body: UpdateAdminQuestionBody,
  ): Promise<UpdateAdminQuestionResponse> {
    return this.service.updateQuestion(params.questionId, body);
  }

  @Delete(':questionId')
  deleteQuestion(
    @ZodParam(adminQuestionParamSchema) params: AdminQuestionParam,
  ): Promise<DeleteAdminQuestionResponse> {
    return this.service.deleteQuestion(params.questionId);
  }
}
