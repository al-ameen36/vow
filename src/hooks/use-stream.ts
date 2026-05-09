import { useRef, useState } from 'react'
import { supabase } from '#/lib/supabase'
type AudioSource = 'mic' | 'tab'

export function useWhisperStream() {
  const [active, setActive] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [source, setSource] = useState<AudioSource>('mic')

  const socketRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // finalized transcript
  const segmentsRef = useRef('')

  // live partial transcript
  const bufferRef = useRef('')

  const updateTranscript = () => {
    const combined = segmentsRef.current
      ? bufferRef.current
        ? `${segmentsRef.current} ${bufferRef.current}`
        : segmentsRef.current
      : bufferRef.current

    setTranscript(combined)
  }

  const getAudioStream = async (source: AudioSource) => {
    if (source === 'mic') {
      return navigator.mediaDevices.getUserMedia({
        audio: true,
      })
    }

    if (source === 'tab') {
      return navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
    }
  }

  const start = async (
    selectedSource: AudioSource = source,
    meetingId?: string,
  ) => {
    // -------------------------
    // reset state
    // -------------------------

    segmentsRef.current = ''
    bufferRef.current = ''

    setTranscript('')
    setSource(selectedSource)

    // -------------------------
    // stable session id
    // -------------------------

    const sessionId = meetingId ?? crypto.randomUUID()

    // -------------------------
    // websocket
    // -------------------------

    const socket = new WebSocket(import.meta.env.VITE_WHISPER_SERVER_URL)

    socketRef.current = socket

    socket.onopen = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      socket.send(
        JSON.stringify({
          uid: sessionId,
          meeting_id: sessionId,
          language: 'en',
          task: 'transcribe',
          model: 'small',
          use_vad: true,
          token: session?.access_token,
        }),
      )

      const stream = await getAudioStream(selectedSource)

      if (!stream) {
        return
      }

      streamRef.current = stream

      // -------------------------
      // audio context
      // -------------------------

      const audioCtx = new AudioContext({
        sampleRate: 16000,
      })

      audioCtxRef.current = audioCtx

      // -------------------------
      // worklet
      // -------------------------

      const workletCode = `
        class VowProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0]

            if (input && input[0]) {
              this.port.postMessage(input[0].buffer)
            }

            return true
          }
        }

        registerProcessor(
          'vow-processor',
          VowProcessor
        )
      `

      const blob = new Blob([workletCode], {
        type: 'application/javascript',
      })

      const url = URL.createObjectURL(blob)

      await audioCtx.audioWorklet.addModule(url)

      const sourceNode = audioCtx.createMediaStreamSource(stream)

      const workletNode = new AudioWorkletNode(audioCtx, 'vow-processor')

      workletNode.port.onmessage = (event) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data)
        }
      }

      sourceNode.connect(workletNode)

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }

      setActive(true)
    }

    // -------------------------
    // streaming transcript
    // -------------------------

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // finalized segments

        if (data.segments?.length) {
          segmentsRef.current = data.segments
            .map((s: any) => s.text.trim())
            .join(' ')
        }

        // live partial

        if (data.buffer_transcription !== undefined) {
          bufferRef.current = data.buffer_transcription.trim()
        }

        updateTranscript()
      } catch {
        // ignore malformed packets
      }
    }

    socket.onerror = (err) => {
      console.error('[WS] socket error', err)
    }

    socket.onclose = () => {
      stop()
    }
  }

  const stop = () => {
    socketRef.current?.close()

    audioCtxRef.current?.close().catch(() => {})

    streamRef.current?.getTracks().forEach((t) => t.stop())

    socketRef.current = null
    audioCtxRef.current = null
    streamRef.current = null

    segmentsRef.current = ''
    bufferRef.current = ''

    setActive(false)
  }

  return {
    active,
    transcript,
    start,
    stop,
    source,
  }
}
