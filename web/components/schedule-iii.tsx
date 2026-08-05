import Link from 'next/link';
import { formatMoney } from '@/lib/format-money';
import type { ScheduleIIISection } from '@/lib/types';

export function ScheduleIIILineItem({ item }: { item: ScheduleIIISection['items'][number] }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm font-medium text-gray-800">
        <span>{item.label}</span>
        <span>{formatMoney(item.total)}</span>
      </div>
      <div className="mt-1 space-y-1 pl-4">
        {item.accounts.map((a) => (
          <div key={a.accountCode} className="flex items-center justify-between text-xs text-gray-500">
            <Link
              href={`/admin/reports/general-ledger?account=${a.accountCode}`}
              className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              {a.accountName}
            </Link>
            <span>{formatMoney(a.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduleIIISubsection({
  number,
  title,
  section,
}: {
  number: string;
  title: string;
  section: ScheduleIIISection;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
        <span>
          ({number}) {title}
        </span>
        <span>{formatMoney(section.total)}</span>
      </div>
      {section.items.length === 0 ? (
        <p className="py-2 text-xs text-gray-400">None</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {section.items.map((item) => (
            <ScheduleIIILineItem key={item.group} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
