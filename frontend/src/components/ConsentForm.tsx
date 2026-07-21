'use client';

import { useForm } from '@tanstack/react-form';
import { ChevronRightIcon } from 'lucide-react';
import LegalDocumentDialog from '@/components/LegalDocumentDialog';
import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Separator } from '@/components/shadcn/separator';
import { useConsent } from '@/lib/hooks';
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '@/lib/legalContent';

type ConsentFormValues = {
  terms: boolean;
  privacy: boolean;
  age14: boolean;
};

type ConsentFormProps = {
  onAgreed: () => void;
};

function useConsentForm(onAgreed: () => void) {
  const consent = useConsent();

  const form = useForm({
    defaultValues: { terms: false, privacy: false, age14: false } as ConsentFormValues,
    onSubmit: async ({ value }) => {
      if (!value.terms || !value.privacy || !value.age14) {
        return;
      }

      await consent.mutateAsync();
      onAgreed();
    },
  });

  return { form, isSubmitting: consent.isPending };
}

export default function ConsentForm({ onAgreed }: ConsentFormProps) {
  const { form, isSubmitting } = useConsentForm(onAgreed);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div>
        <h2 className="text-base font-medium">서비스 이용을 위한 약관 동의</h2>
        <p className="text-sm text-muted-foreground">
          첫 로그인을 완료하려면 아래 약관에 모두 동의해 주세요.
        </p>
      </div>

      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={values.terms && values.privacy && values.age14}
              onCheckedChange={(checked) => {
                const next = checked === true;
                form.setFieldValue('terms', next);
                form.setFieldValue('privacy', next);
                form.setFieldValue('age14', next);
              }}
            />
            전체 동의
          </label>
        )}
      </form.Subscribe>

      <Separator />

      <form.Field name="terms">
        {(field) => (
          <div className="flex items-center justify-between gap-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
              />
              <span>[필수] 이용약관</span>
            </label>
            <LegalDocumentDialog title="이용약관" content={TERMS_OF_SERVICE_TEXT}>
              <span className="flex items-center gap-0.5 text-muted-foreground underline underline-offset-2 hover:text-foreground">
                보기 <ChevronRightIcon className="size-3" />
              </span>
            </LegalDocumentDialog>
          </div>
        )}
      </form.Field>

      <form.Field name="privacy">
        {(field) => (
          <div className="flex items-center justify-between gap-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
              />
              <span>[필수] 개인정보처리방침</span>
            </label>
            <LegalDocumentDialog title="개인정보처리방침" content={PRIVACY_POLICY_TEXT}>
              <span className="flex items-center gap-0.5 text-muted-foreground underline underline-offset-2 hover:text-foreground">
                보기 <ChevronRightIcon className="size-3" />
              </span>
            </LegalDocumentDialog>
          </div>
        )}
      </form.Field>

      <form.Field name="age14">
        {(field) => (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked === true)}
            />
            <span>[필수] 만 14세 이상입니다</span>
          </label>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <Button
            type="submit"
            disabled={!values.terms || !values.privacy || !values.age14 || isSubmitting}
          >
            동의하고 시작하기
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
