import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';
import { cn } from '@/lib/utils';

type ErrorPanelProps = {
  message: string;
  title?: string;
  className?: string;
};

export function ErrorPanel({ message, title, className }: ErrorPanelProps) {
  return (
    <Alert variant="destructive" className={cn('px-4 py-3', className)}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
