import { ArrowDown, CircleDot, Database, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

interface LandingPageProps {
  onEnter: () => void
}

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <motion.section
      className="landing-screen"
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -80 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      onWheel={(event) => {
        if (event.deltaY > 8) onEnter()
      }}
      onTouchMove={onEnter}
      aria-label="Exam Score Predictor introduction"
    >
      <div className="landing-grid" aria-hidden />
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="esp-logo" aria-hidden>
            ESP
          </span>
          <span>Exam Score Predictor</span>
        </div>
        <div className="landing-status">
          <span className="status-dot" />
          MODEL ONLINE
        </div>
      </header>

      <div className="landing-layout">
        <div className="landing-copy">
          <p className="landing-eyebrow">A transparent prediction engine</p>
          <h1>
            Read the signals behind the <span>score.</span>
          </h1>
          <p className="landing-description">
            Test a student profile against 19 factors. Get the estimate, the baseline, and the model&apos;s reasoning in
            one focused view.
          </p>
          <div className="landing-metrics" aria-label="Model metrics">
            <div>
              <strong>0.826</strong>
              <span>R² TEST SCORE</span>
            </div>
            <div>
              <strong>1,322</strong>
              <span>TEST RECORDS</span>
            </div>
            <div>
              <strong>19</strong>
              <span>STUDENT FACTORS</span>
            </div>
          </div>
        </div>

        <div className="landing-visual" aria-hidden>
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <motion.div
            className="signal-card signal-card-main"
            initial={{ opacity: 1, y: 0, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ delay: 0.25, duration: 0.65 }}
          >
            <div className="signal-card-top">
              <span>prediction_output.json</span>
              <span className="ready-label">READY</span>
            </div>
            <div className="signal-score">
              <span>76.4</span>
              <small>/ 100</small>
            </div>
            <div className="signal-delta">▲ +9.2 vs baseline</div>
            <div className="signal-rule" />
            <p className="signal-heading">CONTRIBUTION TRACE</p>
            <SignalRow label="hours_studied" width="86%" value="+1.8" positive />
            <SignalRow label="attendance" width="68%" value="+1.1" positive />
            <SignalRow label="distance_from_home" width="35%" value="−0.4" />
          </motion.div>

          <motion.div
            className="signal-note signal-note-top"
            initial={{ opacity: 1, x: 0, rotate: 5 }}
            animate={{ opacity: 1, x: 0, rotate: 5 }}
            transition={{ delay: 0.5, duration: 0.55 }}
          >
            <Sparkles size={14} />
            <span>Every number has a trail.</span>
          </motion.div>
          <motion.div
            className="signal-note signal-note-bottom"
            initial={{ opacity: 1, x: 0, rotate: -4 }}
            animate={{ opacity: 1, x: 0, rotate: -4 }}
            transition={{ delay: 0.65, duration: 0.55 }}
          >
            <Database size={14} />
            <span>19 features / one clearer picture</span>
          </motion.div>
          <div className="signal-pill signal-pill-one">
            <CircleDot size={13} />
            Linear Regression
          </div>
          <div className="signal-pill signal-pill-two">EXPLAINABLE BY DESIGN</div>
        </div>
      </div>

      <button className="landing-scroll-cue" type="button" onClick={onEnter} aria-label="Scroll to the predictor">
        <span>Scroll to explore the model</span>
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        >
          <ArrowDown size={17} />
        </motion.span>
      </button>
    </motion.section>
  )
}

function SignalRow({ label, width, value, positive }: { label: string; width: string; value: string; positive?: boolean }) {
  return (
    <div className="signal-row">
      <span>{label}</span>
      <i>
        <b className={positive ? 'signal-positive' : 'signal-negative'} style={{ width }} />
      </i>
      <em className={positive ? 'signal-positive-text' : 'signal-negative-text'}>{value}</em>
    </div>
  )
}
