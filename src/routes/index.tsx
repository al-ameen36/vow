import { createFileRoute } from '@tanstack/react-router'
import { useWhisperStream } from '#/hooks/use-stream'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { active, start, stop } = useWhisperStream()

  const toggleSession = () => {
    if (active) {
      stop()
    } else {
      // Connect to your Ngrok/AMD Cloud endpoint
      start()
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      {/* Live Status Pill */}
      <div
        className={`mb-8 px-4 py-1 rounded-full border text-xs flex items-center gap-2 
        ${active ? 'border-cyan-500 text-cyan-500' : 'border-zinc-800 text-zinc-500'}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${active ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-800'}`}
        />
        {active ? 'LIVE STREAMING' : 'READY TO VOW'}
      </div>

      {/* Main Action Button (Uber Style) */}
      <button
        onClick={toggleSession}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
          ${active ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-white text-black'}`}
      >
        {active ? 'Stop' : 'Record'}
      </button>

      <p className="mt-6 text-zinc-400 font-light tracking-wide">
        {active ? 'Listening for commitments...' : 'Tap to start session'}
      </p>
    </div>
  )
}
