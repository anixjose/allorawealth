type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue';

const toneClasses: Record<Tone, string> = {
  green: 'bg-success-bg text-emerald-deep ring-emerald-deep/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  gray: 'bg-gray-50 text-gray-600 ring-gray-500/20',
  blue: 'bg-brand-50 text-royal-blue ring-royal-blue/20',
};

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'green',
  POSTED: 'green',
  COMPLETED: 'green',
  RECONCILED: 'green',
  VERIFIED: 'green',
  CLEARED: 'green',
  DISBURSED: 'green',
  APPROVED: 'blue',
  OPEN: 'blue',
  PENDING: 'amber',
  PENDING_ACTIVATION: 'amber',
  PENDING_APPROVAL: 'amber',
  UNDER_REVIEW: 'amber',
  PROCESSING: 'amber',
  PARTIALLY_PAID: 'amber',
  RECEIVED: 'amber',
  EXCEPTION: 'red',
  REJECTED: 'red',
  FAILED: 'red',
  DEFAULTED: 'red',
  CANCELLED: 'gray',
  CLOSED: 'gray',
  REVERSED: 'gray',
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: Tone }) {
  const resolvedTone = tone ?? 'gray';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[resolvedTone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'gray'}>{status.replace(/_/g, ' ')}</Badge>;
}
