'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog';

type LegalDocumentDialogProps = {
  title: string;
  content: string;
  children: ReactNode;
};

/**
 * Assets/약관 원문에는 서식 강조용 <strong> 태그와 <!-- --> 작성자 메모, 그리고
 * <전화번호>같은 플레이스홀더 꺾쇠괄호가 섞여 있다. 전체를 이스케이프한 뒤
 * <strong> 태그만 되살려서, 플레이스홀더가 실제 HTML 태그로 파싱되어
 * 사라지는 것을 막는다.
 */
function toSafeHtml(raw: string): string {
  const withoutAuthoringNotes = raw.replace(/<!--[\s\S]*?-->\n?/g, '');

  return withoutAuthoringNotes
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;strong&gt;/g, '<strong>')
    .replace(/&lt;\/strong&gt;/g, '</strong>');
}

export default function LegalDocumentDialog({ title, content, children }: LegalDocumentDialogProps) {
  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div
          className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: toSafeHtml(content) }}
        />
      </DialogContent>
    </Dialog>
  );
}
