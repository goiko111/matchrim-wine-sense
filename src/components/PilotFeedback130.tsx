import { MessageSquare } from 'lucide-react';
import { pilotFeedbackHref130, type PilotFeedbackContext130 } from '@/utils/pilotFeedback130';

// Opens the tester's own mail app with a prefilled message; the app sends nothing itself.
export const PilotFeedback130 = ({ label, context }: { label: string; context: PilotFeedbackContext130 }) =>
  <a href={pilotFeedbackHref130(context)} data-testid="pilot-feedback130"
    className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 whitespace-normal rounded-md border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-900 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-900">
    <MessageSquare aria-hidden="true" className="h-4 w-4 shrink-0" />{label}
  </a>;
