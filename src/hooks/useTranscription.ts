import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import {
  type Transcript,
  type TranscriptionOptions,
  getStatus,
  transcribe,
  uploadFile,
} from '../lib/api'

export type FlowStep = 'idle' | 'uploading' | 'processing' | 'done' | 'error'
export type FailedAt = 'upload' | 'transcribe' | 'status' | null

export type UseTranscriptionState = {
  step: FlowStep
  failedAt: FailedAt
  errorMessage: string | null

  file: File | null
  uploadProgress: number

  options: TranscriptionOptions

  uploadUrl: string | null
  transcriptId: string | null
  transcript: Transcript | null

  elapsedSeconds: number
  status: Transcript['status'] | null
}

export function useTranscription() {
  const [step, setStep] = useState<FlowStep>('idle')
  const [failedAt, setFailedAt] = useState<FailedAt>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [options, setOptions] = useState<TranscriptionOptions>({
    speaker_labels: false,
    language_detection: true,
    punctuate: true,
    format_text: true,
  })

  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [transcriptId, setTranscriptId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [status, setStatus] = useState<Transcript['status'] | null>(null)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const pollIntervalRef = useRef<number | null>(null)
  const elapsedIntervalRef = useRef<number | null>(null)
  const abortUploadRef = useRef<AbortController | null>(null)
  const abortPollRef = useRef<AbortController | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async (f: File) => {
      abortUploadRef.current?.abort()
      const ac = new AbortController()
      abortUploadRef.current = ac
      return await uploadFile({
        file: f,
        onProgress: setUploadProgress,
        signal: ac.signal,
      })
    },
  })

  const transcribeMutation = useMutation({
    mutationFn: async (args: { upload_url: string; options: TranscriptionOptions }) => {
      return await transcribe({ upload_url: args.upload_url, options: args.options })
    },
  })

  const state: UseTranscriptionState = useMemo(
    () => ({
      step,
      failedAt,
      errorMessage,
      file,
      uploadProgress,
      options,
      uploadUrl,
      transcriptId,
      transcript,
      elapsedSeconds,
      status,
    }),
    [
      step,
      failedAt,
      errorMessage,
      file,
      uploadProgress,
      options,
      uploadUrl,
      transcriptId,
      transcript,
      elapsedSeconds,
      status,
    ],
  )

  function dismissError() {
    setErrorMessage(null)
    if (step === 'error') {
      setStep(uploadUrl ? 'processing' : 'idle')
      setFailedAt(null)
    }
  }

  function startElapsedTimer() {
    if (elapsedIntervalRef.current != null) return
    elapsedIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
  }

  function stopElapsedTimer() {
    if (elapsedIntervalRef.current == null) return
    window.clearInterval(elapsedIntervalRef.current)
    elapsedIntervalRef.current = null
  }

  function stopPolling() {
    if (pollIntervalRef.current != null) {
      window.clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    abortPollRef.current?.abort()
    abortPollRef.current = null
    stopElapsedTimer()
  }

  async function pollOnce(id: string) {
    abortPollRef.current?.abort()
    const ac = new AbortController()
    abortPollRef.current = ac

    const data = await getStatus(id, ac.signal)
    setTranscript(data)
    setStatus(data.status)

    if (data.status === 'completed') {
      stopPolling()
      setStep('done')
      setFailedAt(null)
      setErrorMessage(null)
      return
    }

    if (data.status === 'error') {
      stopPolling()
      setStep('error')
      setFailedAt('status')
      setErrorMessage(data.error ?? 'Transcription failed.')
    }
  }

  function startPolling(id: string) {
    stopPolling()
    setElapsedSeconds(0)
    startElapsedTimer()

    void pollOnce(id).catch((err: unknown) => {
      setStep('error')
      setFailedAt('status')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch status.')
      stopPolling()
    })

    pollIntervalRef.current = window.setInterval(() => {
      void pollOnce(id).catch((err: unknown) => {
        setStep('error')
        setFailedAt('status')
        setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch status.')
        stopPolling()
      })
    }, 5000)
  }

  async function runUploadAndTranscribe() {
    if (!file) return

    setErrorMessage(null)
    setFailedAt(null)
    setTranscript(null)
    setTranscriptId(null)
    setStatus(null)
    setUploadProgress(0)

    setStep('uploading')
    let finalUploadUrl: string
    try {
      const up = await uploadMutation.mutateAsync(file)
      setUploadUrl(up.upload_url)
      finalUploadUrl = up.upload_url
    } catch (err: unknown) {
      setStep('error')
      setFailedAt('upload')
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.')
      return
    }

    setStep('processing')
    try {
      const { transcript_id } = await transcribeMutation.mutateAsync({
        upload_url: finalUploadUrl,
        options,
      })
      setTranscriptId(transcript_id)
      startPolling(transcript_id)
    } catch (err: unknown) {
      setStep('error')
      setFailedAt('transcribe')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit job.')
    }
  }

  async function retryFromFailedStep() {
    setErrorMessage(null)
    setFailedAt(null)

    if (failedAt === 'upload') {
      await runUploadAndTranscribe()
      return
    }

    if (failedAt === 'transcribe' || failedAt === 'status') {
      if (!uploadUrl) {
        setStep('error')
        setFailedAt('upload')
        setErrorMessage('Missing upload URL. Please re-upload the file.')
        return
      }

      setStep('processing')
      try {
        const { transcript_id } = await transcribeMutation.mutateAsync({
          upload_url: uploadUrl,
          options,
        })
        setTranscriptId(transcript_id)
        setTranscript(null)
        setStatus(null)
        startPolling(transcript_id)
      } catch (err: unknown) {
        setStep('error')
        setFailedAt('transcribe')
        setErrorMessage(err instanceof Error ? err.message : 'Failed to submit job.')
      }
    }
  }

  function cancelPolling() {
    stopPolling()
    setStep('idle')
    setFailedAt(null)
    setErrorMessage(null)
    setTranscript(null)
    setTranscriptId(null)
    setStatus(null)
    setElapsedSeconds(0)
  }

  function startOver() {
    stopPolling()
    abortUploadRef.current?.abort()
    abortUploadRef.current = null

    setStep('idle')
    setFailedAt(null)
    setErrorMessage(null)
    setFile(null)
    setUploadProgress(0)
    setUploadUrl(null)
    setTranscriptId(null)
    setTranscript(null)
    setStatus(null)
    setElapsedSeconds(0)
  }

  useEffect(() => {
    return () => {
      stopPolling()
      abortUploadRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    state,
    setFile,
    setOptions,
    runUploadAndTranscribe,
    retryFromFailedStep,
    cancelPolling,
    startOver,
    dismissError,
    uploadMutation,
    transcribeMutation,
  }
}

