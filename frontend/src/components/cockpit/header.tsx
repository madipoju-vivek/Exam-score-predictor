import { Moon, Sun } from 'lucide-react'

import type { Schema, StudentValues } from '@/lib/api'
import { estimateScore, matches } from '@/lib/model'

interface Props {
  schema: Schema | null
  values: StudentValues | null
  /** The current prediction from the API, once it has arrived. */
  score: number | null
  online: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onPick: (values: StudentValues) => void
}

export function Header({ schema, values, score, online, theme, onToggleTheme, onPick }: Props) {
  const isPreset = !!schema && !!values && schema.presets.some((p) => matches(schema, p.values, values))

  return (
    <header className="ck-header">
      <div className="ck-brand">
        <span className="ck-logo" aria-hidden>
          <svg viewBox="0 0 44 44">
            <circle cx="9" cy="31" r="2.2" />
            <circle cx="15" cy="24" r="2.2" />
            <circle cx="20" cy="28" r="2.2" />
            <circle cx="26" cy="17" r="2.2" />
            <circle cx="31" cy="20" r="2.2" />
            <circle cx="36" cy="10" r="2.2" />
            <path pathLength={1} d="M7 33 37 10" />
          </svg>
        </span>
        <span className="ck-title">
          <b>Exam Score Predictor</b>
          <small>Linear Regression, 19 student factors</small>
        </span>
        <span className={`ck-live ${online ? '' : 'off'}`}>
          <i />
          {online ? 'Model online' : 'Model offline'}
        </span>
      </div>

      <div className="ck-right">
        {schema && values && (
          <div className="ck-profiles" role="group" aria-label="Student profiles">
            {schema.presets.map((preset) => {
              const presetScore = estimateScore(schema, preset.values)
              const difference = presetScore - schema.baseline
              const tone = difference > 2 ? 'up' : difference < -2 ? 'down' : ''
              return (
                <button
                  key={preset.name}
                  type="button"
                  className={`ck-prof ${tone}`}
                  aria-pressed={matches(schema, preset.values, values)}
                  onClick={() => onPick(preset.values)}
                >
                  <Ring value={presetScore} />
                  <span className="ck-prof-text">
                    <b>{preset.name.replace(' student', '')}</b>
                    <small>{summary(preset.values)}</small>
                  </span>
                </button>
              )
            })}
            {/* Once the inputs stop matching a profile, a card appears for the student being built. */}
            {!isPreset && score !== null && (
              <div className="ck-prof custom">
                <Ring value={score} />
                <span className="ck-prof-text">
                  <b>Your changes</b>
                  <small>{summary(values)}</small>
                </span>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          className="ck-icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}

const summary = (v: StudentValues) => `${v.Hours_Studied} hrs, ${v.Attendance}% attendance`

function Ring({ value }: { value: number }) {
  return (
    <span className="ck-ring">
      <svg viewBox="0 0 44 44" aria-hidden>
        <circle className="t" cx="22" cy="22" r="18" />
        <circle className="v" cx="22" cy="22" r="18" pathLength={100} strokeDasharray={`${value.toFixed(1)} 100`} />
      </svg>
      <b>{Math.round(value)}</b>
    </span>
  )
}
