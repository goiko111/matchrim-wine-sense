import { Globe } from 'lucide-react';
import { LANGUAGE_OPTIONS, useI18n, type Locale } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Props {
  variant?: 'icon' | 'compact';
  className?: string;
}

const LanguageSwitcher = ({ variant = 'icon', className }: Props) => {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`gap-2 text-xs text-red-900 hover:bg-red-50 ${className ?? ''}`}
          aria-label={t('common.language')}
        >
          <Globe className="h-4 w-4" />
          {variant === 'compact' ? locale : `${locale}`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setLocale(opt.value as Locale)}
            className={opt.value === locale ? 'font-semibold text-red-800' : ''}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
