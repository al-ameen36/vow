import { motion } from 'motion/react'
import { Flag, Sparkles, Grid3x3 } from 'lucide-react'

type FilterType = 'all' | 'flagged' | 'general'

interface InsightFilterProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
  counts: {
    all: number
    flagged: number
    general: number
  }
}

export function InsightFilter({
  activeFilter,
  onFilterChange,
  counts,
}: InsightFilterProps) {
  const filters: { id: FilterType; label: string; icon: any }[] = [
    { id: 'all', label: 'All', icon: Grid3x3 },
    { id: 'flagged', label: 'Flagged', icon: Flag },
    { id: 'general', label: 'General', icon: Sparkles },
  ]

  return (
    <div className="flex gap-2 p-1 bg-zinc-900/50 backdrop-blur-xl rounded-md border border-zinc-800/50 w-fit">
      {filters.map((filter) => {
        const Icon = filter.icon
        const isActive = activeFilter === filter.id
        const count = counts[filter.id]

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className="relative px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
          >
            {isActive && (
              <motion.div
                layoutId="activeFilter"
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-md border border-cyan-500/30"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className="relative flex items-center gap-2">
              <Icon
                className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`}
              />
              <span className={isActive ? 'text-white' : 'text-zinc-400'}>
                {filter.label}
              </span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-xs rounded-full ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
