import { useRef, useState } from 'react'

export function useWhisperStream() {
  const [active, setActive] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const start = async () => {
    // 1. Establish the connection
    const socket = new WebSocket('wss://677f-34-145-73-171.ngrok-free.app/')
    socketRef.current = socket

    socket.onopen = async () => {
      // whisper_live expects a JSON configuration payload as the first message
      socket.send(JSON.stringify({
        uid: crypto.randomUUID(),
        language: 'en',
        task: 'transcribe',
        model: 'small',
        use_vad: true
      }))

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const audioCtx = new AudioContext({ sampleRate: 16000 })
      audioCtxRef.current = audioCtx

      // 2. Load the Worklet module via an inline Blob
      const workletCode = `
        class VowProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0]
            if (input && input.length > 0) {
              const float32Buffer = input[0]
              const int16Buffer = new Int16Array(float32Buffer.length)
              for (let i = 0; i < float32Buffer.length; i++) {
                let s = Math.max(-1, Math.min(1, float32Buffer[i]))
                int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
              }
              this.port.postMessage(int16Buffer.buffer)
            }
            return true
          }
        }
        registerProcessor('vow-processor', VowProcessor)
      `
      const blob = new Blob([workletCode], { type: 'application/javascript' })
      const workletUrl = URL.createObjectURL(blob)
      await audioCtx.audioWorklet.addModule(workletUrl)

      const source = audioCtx.createMediaStreamSource(stream)
      const vowNode = new AudioWorkletNode(audioCtx, 'vow-processor')

      // 3. Receive the converted Int16 data from the worklet and pipe to WebSocket
      vowNode.port.onmessage = (event) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data)
        }
      }

      source.connect(vowNode)
      setActive(true)
    }

    socket.onmessage = (event) => {
      // Raw transcripts will appear here
      console.log('VOW Feed:', JSON.parse(event.data))
    }

    socket.onclose = () => stop()
  }

  const stop = () => {
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED && socketRef.current.readyState !== WebSocket.CLOSING) {
      socketRef.current.close()
    }
    
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    socketRef.current = null
    audioCtxRef.current = null
    streamRef.current = null

    setActive(false)
  }

  return { active, start, stop }
}
