'use client';

export function ContextUsageBar({ usedTokens, contextLimit }: { usedTokens: number; contextLimit: number }) {
  if (contextLimit <= 0) return null;

  const pct = Math.min(100, Math.round((usedTokens / contextLimit) * 100));
  const usedK = (usedTokens / 1000).toFixed(1);
  const limitK = (contextLimit / 1000).toFixed(0);

  let barColor = 'bg-[#4ec9b0]';
  let label = '';
  if (pct >= 90) { barColor = 'bg-[#c74e39]'; label = 'Near limit'; }
  else if (pct >= 70) { barColor = 'bg-[#e2c08d]'; label = 'Getting full'; }

  return (
    <div className="flex items-center gap-2 text-[9px] text-[#888] mt-1">
      <div className="flex-1 h-1 bg-[#333] rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono flex-shrink-0">
        {usedTokens >= 0 ? `~${usedK}k / ${limitK}k` : 'Token usage unavailable'}
      </span>
      {label && <span className="text-[8px] text-[#e2c08d] flex-shrink-0">{label}</span>}
    </div>
  );
}
