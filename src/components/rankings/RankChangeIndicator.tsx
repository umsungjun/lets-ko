interface RankChangeProps {
  change: number;
  isNR: boolean;
}

export default function RankChangeIndicator({
  change,
  isNR,
}: RankChangeProps) {
  if (isNR) {
    return (
      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-600">
        NR
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600">
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2l4 5H2z" />
        </svg>
        {change}
      </span>
    );
  }

  if (change < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500">
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 10l4-5H2z" />
        </svg>
        {Math.abs(change)}
      </span>
    );
  }

  return <span className="text-xs text-muted/40">—</span>;
}
