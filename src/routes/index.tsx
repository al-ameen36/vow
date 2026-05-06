import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useWhisperStream } from '#/hooks/use-stream'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { active, transcript, start, stop } = useWhisperStream()

  const [source, setSource] = useState<'mic' | 'tab'>('mic')

  const toggleSession = () => {
    if (active) {
      stop()
    } else {
      start(source)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      {/* Status */}
      <div
        className={`mb-6 px-4 py-1 rounded-full border text-xs flex items-center gap-2 
        ${active ? 'border-cyan-500 text-cyan-500' : 'border-zinc-800 text-zinc-500'}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${active ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-800'}`}
        />
        {active ? 'LIVE STREAMING' : 'READY'}
      </div>

      {/* Source Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSource('mic')}
          className={`px-4 py-2 rounded border text-sm ${
            source === 'mic'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-zinc-800 text-zinc-500'
          }`}
        >
          Mic
        </button>

        <button
          onClick={() => setSource('tab')}
          className={`px-4 py-2 rounded border text-sm ${
            source === 'tab'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-zinc-800 text-zinc-500'
          }`}
        >
          Tab / Screen
        </button>
      </div>

      {/* Transcript */}
      <div className="mt-4 p-4 min-h-24 w-full max-w-xl rounded border border-zinc-800">
        {transcript || 'Waiting for audio...'}
      </div>

      {/* Main Button */}
      <button
        onClick={toggleSession}
        className={`w-24 h-24 mt-8 rounded-full flex items-center justify-center transition-all duration-300
          ${active ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-white text-black'}`}
      >
        {active ? 'Stop' : 'Start'}
      </button>

      <p className="mt-6 text-zinc-400 font-light tracking-wide">
        {active
          ? `Listening from ${source === 'mic' ? 'microphone' : 'tab'}...`
          : 'Select source and start'}
      </p>
    </div>
  )
}
