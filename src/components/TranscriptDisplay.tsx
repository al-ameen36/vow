import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'

interface TranscriptDisplayProps {
  transcript: string
  isListening: boolean
}

export function TranscriptDisplay({
  transcript,
  isListening,
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div className="relative">
      {/* Listening indicator pulse */}
      {isListening && (
        <motion.div
          className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div
        ref={scrollRef}
        className="relative w-full bg-gradient-to-br from-black/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-md p-6 overflow-y-auto custom-scrollbar"
      >
        {!isListening && !transcript ? (
          <div className="flex items-center justify-center h-[40vh]">
            <p className="text-zinc-600 text-sm">Waiting for audio...</p>
          </div>
        ) : (
          <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap">
            {transcript}
            {isListening && (
              <motion.span
                className="inline-block w-1 h-4 bg-cyan-400 ml-1"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </p>
        )}
      </div>
    </div>
  )
}
