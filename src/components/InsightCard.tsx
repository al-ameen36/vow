import { motion } from 'motion/react'
import { Flag, Check, X } from 'lucide-react'

interface InsightCardProps {
  type: 'COMMITMENT' | 'UPDATE'
  title: string
  description: string
  timestamp: string
  isFlagged?: boolean
  onAccept?: () => void
  onReject?: () => void
  onToggleFlag?: () => void
}

export function InsightCard({
  type,
  description,
  timestamp,
  isFlagged = false,
  onAccept,
  onReject,
  onToggleFlag,
}: InsightCardProps) {
  const isCommitment = type === 'COMMITMENT'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`group relative bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 backdrop-blur-xl rounded-md p-5 hover:border-zinc-700/50 transition-all duration-300 overflow-hidden ${
        isCommitment
          ? 'border-2 border-amber-500/60 shadow-lg shadow-amber-500/20'
          : 'border border-zinc-800/50'
      }`}
    >
      {/* Gradient overlay on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 rounded-md ${
          isCommitment
            ? 'from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/10 group-hover:to-orange-500/10'
            : 'from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5'
        }`}
      />

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  type === 'COMMITMENT' ? 'text-amber-400' : 'text-blue-400'
                }`}
              >
                {type === 'COMMITMENT' ? 'FLAGGED' : 'GENERAL'}
              </span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">{timestamp}</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Flag button */}
          {onToggleFlag && (
            <button
              onClick={onToggleFlag}
              className={`flex-shrink-0 p-2 rounded-md transition-all duration-200 ${
                isFlagged
                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                  : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
            >
              <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Action buttons for commitments */}
        {type === 'COMMITMENT' && onAccept && onReject && (
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="group/btn flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-md transition-all duration-200 shadow-lg shadow-green-500/20"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={onReject}
              className="group/btn flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-md border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
