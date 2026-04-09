import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, Sparkles, X } from 'lucide-react'

import { OptionsPanel } from './components/OptionsPanel'
import { ProgressTracker } from './components/ProgressTracker'
import { TranscriptResult } from './components/TranscriptResult'
import { UploadZone } from './components/UploadZone'
import { useTranscription } from './hooks/useTranscription'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Separator } from './components/ui/separator'

export default function App() {
  const {
    state,
    setFile,
    setOptions,
    runUploadAndTranscribe,
    retryFromFailedStep,
    cancelPolling,
    startOver,
    dismissError,
  } = useTranscription()

  const canStart = state.file != null && state.step === 'idle'
  const disableInputs = state.step === 'uploading' || state.step === 'processing'

  return (
    <div className="min-h-dvh bg-zinc-900 px-4 py-10">
      <div className="mx-auto w-full max-w-[720px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/40">
                <Sparkles className="h-4 w-4 text-zinc-200" />
              </span>
              Audio Transcriber
            </CardTitle>
            <CardDescription>
              Upload audio, then we’ll transcribe it via AssemblyAI. Your API key stays
              server-side.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="popLayout" initial={false}>
              {state.errorMessage && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Alert className="relative pr-12" variant="destructive">
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{state.errorMessage}</AlertDescription>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => void retryFromFailedStep()}>
                        Retry
                      </Button>
                      <Button type="button" variant="secondary" onClick={startOver}>
                        <RotateCcw />
                        Start over
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8"
                      onClick={dismissError}
                    >
                      <X />
                      <span className="sr-only">Dismiss</span>
                    </Button>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <UploadZone
              file={state.file}
              disabled={disableInputs}
              onFileSelected={(f) => setFile(f)}
            />

            <OptionsPanel
              options={state.options}
              disabled={disableInputs}
              onChange={setOptions}
            />

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                Tip: long files can take a while; you can keep this tab open while we
                process.
              </div>
              <div className="flex gap-2">
                {state.step === 'processing' ? (
                  <Button type="button" variant="outline" onClick={cancelPolling}>
                    Cancel
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={startOver}>
                    <RotateCcw />
                    Reset
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => void runUploadAndTranscribe()}
                  disabled={!canStart}
                >
                  Start transcription
                </Button>
              </div>
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {(state.step === 'uploading' || state.step === 'processing' || state.step === 'done') && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ProgressTracker
                    step={state.step}
                    uploadProgress={state.uploadProgress}
                    elapsedSeconds={state.elapsedSeconds}
                    statusText={
                      state.status === 'queued'
                        ? 'Queued...'
                        : state.status === 'processing'
                          ? 'Processing...'
                          : null
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout" initial={false}>
              {state.step === 'done' && state.transcript && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <TranscriptResult
                    transcript={state.transcript}
                    speakerLabelsEnabled={state.options.speaker_labels}
                    onStartOver={startOver}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
