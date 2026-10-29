import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ServerCrash } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import '@/components/cockpit/cockpit.css'
import { Header } from '@/components/cockpit/header'
import { FluidBackground, scorePaletteStyle } from '@/components/cockpit/fluid-background'
import { StudentPanel } from '@/components/cockpit/student-panel'
import { BuildChart, Distribution, ModelStrip, NextSteps, ProfileRadar, ScoreGauge } from '@/components/cockpit/visuals'
import { LandingPage } from '@/components/landing-page'
import { useTheme } from '@/hooks/use-theme'
import type { ModelInfo, Prediction, Schema, StudentValues } from '@/lib/api'
import { defaultValues, getModelInfo, getSchema, predict } from '@/lib/api'

export default function App() {
  const { theme, toggle } = useTheme()
  const [schema, setSchema] = useState<Schema | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [values, setValues] = useState<StudentValues | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [predictError, setPredictError] = useState(false)
  const [showApp, setShowApp] = useState(false)
  const [tab, setTab] = useState('Academic')
  const [pinned, setPinned] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoadError(false)
    getSchema()
      .then((s) => {
        setSchema(s)
        setTab((current) => (s.groups.includes(current) ? current : s.groups[0]))
        setValues((current) => current ?? defaultValues(s))
      })
      .catch(() => setLoadError(true))
    getModelInfo()
      .then(setModelInfo)
      .catch(() => setModelInfo(null))
  }, [])

  useEffect(load, [load])

  // Ask the API for a new prediction shortly after the inputs stop changing.
  useEffect(() => {
    if (!values) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      predict(values, controller.signal)
        .then((result) => {
          setPrediction(result)
          setPredictError(false)
        })
        .catch((error: unknown) => {
          if ((error as Error).name !== 'AbortError') setPredictError(true)
        })
    }, 60)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [values])

  const change = (name: string, value: number | string) => setValues((v) => ({ ...v, [name]: value }))

  return (
    <AnimatePresence mode="wait" initial>
      {!showApp ? (
        <LandingPage
          key="landing"
          onEnter={() => {
            setShowApp(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      ) : (
        <motion.div
          key="application"
          className="cockpit"
          style={scorePaletteStyle(prediction?.score ?? null)}
          initial={{ opacity: 0, transform: 'translateY(40px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <FluidBackground />
          <div className="ck-wrap">
            <Header
              schema={schema}
              values={values}
              score={prediction?.score ?? null}
              online={!!schema && !predictError}
              theme={theme}
              onToggleTheme={toggle}
              onPick={setValues}
            />

            {loadError ? (
              <ConnectionError onRetry={load} />
            ) : !schema || !values ? (
              <LoadingState />
            ) : (
              <>
                {predictError && (
                  <p className="ck-notice">The prediction service did not respond. Showing the last result.</p>
                )}
                <div className="ck-shell">
                  <StudentPanel
                    schema={schema}
                    values={values}
                    contributions={prediction?.contributions ?? []}
                    tab={tab}
                    pinned={pinned !== null}
                    onTab={setTab}
                    onChange={change}
                    onPin={() => setPinned((p) => (p === null && prediction ? prediction.score : null))}
                    onReset={() => setValues(defaultValues(schema))}
                  />

                  {prediction ? (
                    <div className="ck-grid">
                      <ScoreGauge prediction={prediction} pinned={pinned} />
                      {modelInfo?.score_distribution ? (
                        <Distribution distribution={modelInfo.score_distribution} score={prediction.score} />
                      ) : (
                        <section className="ck-tile ck-s7">
                          <h2>Among all students in the data</h2>
                          <p className="ck-none">The score distribution is not available.</p>
                        </section>
                      )}
                      <BuildChart schema={schema} prediction={prediction} />
                      <ProfileRadar schema={schema} values={values} />
                      <NextSteps
                        schema={schema}
                        values={values}
                        onApply={(name, value, group) => {
                          change(name, value)
                          setTab(group)
                        }}
                      />
                      {modelInfo && <ModelStrip info={modelInfo} />}
                    </div>
                  ) : (
                    <VisualsSkeleton />
                  )}
                </div>
                <p className="ck-fine">
                  An estimate from a Linear Regression model trained on a synthetic dataset. It describes patterns in
                  that data and should not be treated as a guaranteed academic result.
                </p>
              </>
            )}
          </div>

          {/* On small screens the score stays visible while the controls are scrolled. */}
          {prediction && (
            <div className="ck-mobile-score">
              <span>Predicted exam score</span>
              <b>{prediction.score.toFixed(1)}</b>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function VisualsSkeleton() {
  return (
    <div className="ck-grid" aria-busy="true">
      <div className="ck-skel ck-s5" style={{ height: 330 }} />
      <div className="ck-skel ck-s7" style={{ height: 330 }} />
      <div className="ck-skel ck-s12" style={{ height: 290 }} />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="ck-shell" aria-busy="true">
      <div className="ck-skel" style={{ height: 520 }} />
      <VisualsSkeleton />
    </div>
  )
}

function ConnectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="ck-tile ck-error">
      <span className="ck-error-icon">
        <ServerCrash size={24} aria-hidden />
      </span>
      <h2>Can’t reach the prediction service</h2>
      <p>Start the API from the project folder, then try again.</p>
      <code>uvicorn backend.main:app</code>
      <button type="button" className="ck-chip" onClick={onRetry}>
        <RefreshCw size={14} aria-hidden style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
        Try again
      </button>
    </div>
  )
}
