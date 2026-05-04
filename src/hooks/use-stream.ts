import { useRef, useState } from 'react'

export function useWhisperStream() {
  const [active, setActive] = useState(false)
  const [transcript, setTranscript] = useState<string>('')
  const socketRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const start = async () => {
    setTranscript('')
    // 1. Establish the connection
    const socket = new WebSocket('wss://677f-34-145-73-171.ngrok-free.app/')
    socketRef.current = socket

    socket.onopen = async () => {
      // whisper_live expects a JSON configuration payload as the first message
      socket.send(
        JSON.stringify({
          uid: crypto.randomUUID(),
          language: 'en',
          task: 'transcribe',
          model: 'small',
          use_vad: false, // Turned OFF VAD so Whisper is forced to transcribe raw silence/noise immediately
        }),
      )

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
              if (!float32Buffer) return true
              // Whisper_live server expects raw Float32 arrays!
              const float32Clone = new Float32Array(float32Buffer)
              this.port.postMessage(float32Clone.buffer)
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

      // 3. Connect to destination to prevent the browser from garbage collecting the silent node!
      vowNode.connect(audioCtx.destination)

      // 4. Receive the converted Int16 data from the worklet and pipe to WebSocket
      vowNode.port.onmessage = (event) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data)
        }
      }

      source.connect(vowNode)

      // Ensure browser didn't auto-suspend the audio context
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }

      setActive(true)
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)

      // Whisper-live typically sends transcribed text in a 'segments' array
      if (data.segments && Array.isArray(data.segments)) {
        const text = data.segments.map((seg: any) => seg.text).join('')
        setTranscript(text)
      }
    }

    socket.onclose = () => stop()
  }

  const stop = () => {
    if (
      socketRef.current &&
      socketRef.current.readyState !== WebSocket.CLOSED &&
      socketRef.current.readyState !== WebSocket.CLOSING
    ) {
      socketRef.current.close()
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }

    socketRef.current = null
    audioCtxRef.current = null
    streamRef.current = null

    setActive(false)
  }

  return { active, transcript, start, stop }
}
