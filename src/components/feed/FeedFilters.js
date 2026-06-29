'use client';
import clsx from 'clsx';

export default function FeedFilters({ genres, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {genres.map(g => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={clsx(
            'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all',
            active === g
              ? 'bg-[#00C853] text-black'
              : 'bg-[#122B1A] text-[#4A7A5A] border border-[#1A4D2E] hover:border-[#00C853] hover:text-[#00C853]'
          )}
        >
          {g}
        </button>
      ))}
    </div>
  );
}
