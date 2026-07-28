import LegalDocumentDialog from '@/components/LegalDocumentDialog';
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '@/lib/legalContent';

export default function SiteFooter() {
  return (
    <footer className="w-full shrink-0 bg-[var(--color-bg-dark)] px-6 py-8 text-[var(--color-text-inverse)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1 opacity-70">
          <span>이메일: rkdtlseb@naver.com</span>
          <span>전화번호: 010-2688-3997</span>
        </div>
        <div className="flex gap-4">
          <LegalDocumentDialog title="이용약관" content={TERMS_OF_SERVICE_TEXT}>
            <span className="underline underline-offset-4 hover:text-[var(--color-primary)]">
              이용약관
            </span>
          </LegalDocumentDialog>
          <LegalDocumentDialog title="개인정보처리방침" content={PRIVACY_POLICY_TEXT}>
            <span className="underline underline-offset-4 hover:text-[var(--color-primary)]">
              개인정보처리방침
            </span>
          </LegalDocumentDialog>
        </div>
      </div>
    </footer>
  );
}
