import { Compass } from 'lucide-react';

interface AiRimMarkProps {
  className?: string;
  iconClassName?: string;
}

const AiRimMark = ({ className = '', iconClassName = 'h-5 w-5' }: AiRimMarkProps) => (
  <span
    className={`airim-mark relative inline-flex shrink-0 items-center justify-center ${className}`}
    aria-hidden="true"
  >
    <Compass className={iconClassName} strokeWidth={1.8} />
    <span className="absolute h-1.5 w-1.5 rounded-full bg-current ring-2 ring-inherit" />
  </span>
);

export default AiRimMark;
