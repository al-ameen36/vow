import { motion } from 'motion/react'
import { Circle, Square } from 'lucide-react'

interface StartButtonProps {
  isRecording: boolean
  onClick: () => void
}

export function StartButton({ isRecording, onClick }: StartButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
        isRecording 
          ? 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700' 
          : 'bg-red-500 hover:bg-red-400'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isRecording ? "Stop Recording" : "Start Recording"}
    >
      {/* Pulse effect when recording */}
      {isRecording && (
        <motion.div
          className="absolute inset-0 rounded-full bg-red-500/30 border border-red-500/50"
          animate={{ scale: [1, 1.4], opacity: [1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {isRecording ? (
        <Square className="w-3.5 h-3.5 text-red-500 fill-red-500 relative z-10" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-white fill-white relative z-10" />
      )}
    </motion.button>
  )
}
