import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import type { Insight } from '#/types/transcripts'

type Props = {
  insight: Insight
}

export function InsightCard({ insight }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 backdrop-blur-xl rounded-md p-5 border border-zinc-800/50 hover:border-zinc-700/70 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-500 rounded-md" />

      <div className="flex items-start gap-3">
        <div className="min-w-[95px]">
          <div className="mt-1 p-2 rounded-md bg-zinc-800/70 flex justify-center text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <span>{insight.type}</span>
          </div>

          <div className="text-xs text-zinc-400 break-all mt-2 flex gap-2">
            <p>Time</p>
            {insight.start_time && <p>{insight.start_time}</p>}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown>{insight.content}</ReactMarkdown>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
