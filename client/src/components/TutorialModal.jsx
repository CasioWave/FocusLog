import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, BookOpen, Keyboard } from 'lucide-react';

export default function TutorialModal({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to FocusLog",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>FocusLog is an advanced, algorithmically driven time-tracking and productivity application designed specifically for complex STEM workflows. It moves beyond simple Pomodoro tracking by measuring the actual <strong>Cognitive Expenditure</strong> of your sessions.</p>
          <p>At its core, you use the <strong>Timer</strong> to log deep work sessions against specific tags (e.g. Thesis, Math). When you encounter a distraction or get stuck, pause the timer to log the specific cause (Friction Logging). Over time, this generates detailed metrics in the <strong>Stats & Reports</strong> dashboard.</p>
          <div style={{ backgroundColor: 'var(--md-sys-color-surface-variant)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--md-sys-color-primary)' }}>
            <strong>Quick Setup:</strong> Click the gear icon (Settings) to configure your daily/weekly goals, setup your topic tags, and toggle advanced features like Epistemic Tracking, Algorithmic Interleaving, and Custom Aesthetics.
          </div>
        </div>
      )
    },
    {
      title: "Hotkeys & Navigation",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>FocusLog is designed to be completely unobtrusive during deep work. You can trigger essential state changes without touching your mouse using global hotkeys while the timer is running:</p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><kbd style={kbdStyle}>1</kbd> <strong>Ingestion:</strong> Switch current stance to Ingestion.</li>
            <li><kbd style={kbdStyle}>2</kbd> <strong>Symbol Manipulation:</strong> Switch current stance to Symbol Manipulation.</li>
            <li><kbd style={kbdStyle}>3</kbd> <strong>Sense-Making:</strong> Switch current stance to Sense-Making.</li>
            <li><kbd style={kbdStyle}>4</kbd> <strong>Translation:</strong> Switch current stance to Translation.</li>
            <li><kbd style={kbdStyle}>f</kbd> or <kbd style={kbdStyle}>F</kbd> <strong>Log Friction:</strong> Immediately pause the timer and open the Cognitive Friction modal to log what is slowing you down (e.g. ambiguity, lack of prerequisite knowledge).</li>
          </ul>
          <p><em>Note: These hotkeys only activate while a Focus session is actively running.</em></p>
        </div>
      )
    },
    {
      title: "Advanced: Epistemic Tracking",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
          <p>Standard time tracking treats all work equally. <strong>Epistemic Tracking</strong> recognizes that your brain expends energy differently depending on the <em>type</em> of work. We categorize work into 4 distinct stances:</p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>Ingestion (Weight: 0.8):</strong> Reading papers, textbooks, or API documentation. A low-friction state focused on passive absorption and schema building.</li>
            <li><strong>Symbol Manipulation (Weight: 1.5):</strong> Derivations, writing complex code, algebra, or manipulating formal systems. A high-friction state requiring intense working memory.</li>
            <li><strong>Sense-Making (Weight: 1.2):</strong> Evaluating limits, sanity checking, debugging, or mapping new concepts to existing knowledge. Medium friction.</li>
            <li><strong>Translation (Weight: 1.3):</strong> Mapping physical concepts to code, drafting a thesis, or explaining a formalism. Medium-high friction.</li>
          </ul>
          <p>Toggle this on in Settings &gt; Advanced to start logging your cognitive stance during sessions. This unlocks predictive decay modeling.</p>
        </div>
      )
    },
    {
      title: "Focus Decay Modeling (τ & λ)",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
          <p>When Epistemic Tracking is enabled, the app calculates your <strong>Focus Capacity limit (τ)</strong>. Think of this as your cognitive stamina.</p>
          <p>Instead of guessing how long you can study, the application uses local curve-fitting algorithms (Kaplan-Meier survival curves and Phase Space Hazard models) on your distraction frequency to mathematically deduce when your brain hits a wall. Different epistemic states drain this stamina at different rates based on their weights.</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>E:</strong> Cumulative Cognitive Expenditure.</li>
            <li><strong>C(t):</strong> Remaining Focus Capacity (drops from 100% to 0%).</li>
            <li><strong>λ:</strong> Instantaneous Hazard Rate (probability of distraction).</li>
          </ul>
          <div style={{ backgroundColor: 'var(--md-sys-color-surface-variant)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--md-sys-color-error)' }}>
            <strong>Zeigarnik Intervention:</strong> When your capacity drops dangerously low, the timer will automatically intervene and suggest a break or context switch to save your working memory before a complete focus collapse.
          </div>
        </div>
      )
    },
    {
      title: "Algorithmic Interleaving",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>Toggle <strong>Enable Algorithmic Interleaving</strong> in Settings to replace manual topic switching with a dynamic Priority Queue based on proven cognitive science.</p>
          <p>The system calculates exactly <em>what</em> you should study next based on:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Time Decay:</strong> How long it has been since you last studied it. Topics neglected longer gain higher priority.</li>
            <li><strong>Historical Friction:</strong> How difficult the topic was for you last time (measured by your distraction density).</li>
            <li><strong>Cognitive Distance:</strong> Ensuring you don't jump between identical cognitive loads back-to-back (e.g., swapping from heavy Symbol Manipulation to Ingestion).</li>
          </ul>
          <p>The queue is automatically surfaced during a Zeigarnik Intervention, taking the guesswork out of your study schedule.</p>
        </div>
      )
    },
    {
      title: "Spaced Retrieval (Entry Tickets)",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>When Interleaving is enabled, returning to an old topic will trigger an <strong>Entry Ticket</strong>—a core mechanism of spaced retrieval.</p>
          <p>Before you can begin logging time on the topic, the timer will lock and display the last known "friction" or "state" you were in. You must summarize your current schema or understanding of the topic in 1-2 sentences to unlock the timer.</p>
          <p>The app tracks your <strong>Retrieval Latency</strong> (how long it takes you to answer). Over time, as your schema strengthens, this latency should drop. You can view this trend in the Advanced Analytics dashboard to prove your retention is accelerating.</p>
        </div>
      )
    },
    {
      title: "Using the Analytics Dashboard",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>The <strong>Stats & Reports</strong> tab is where your data comes to life. It is split into <em>Overview</em> and <em>Advanced</em>.</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Overview:</strong> View your daily flow times, session durations, tags, and consistency heatmap.</li>
            <li><strong>Advanced:</strong> Contains predictive metrics like Fatigue Curves, Epistemic Endurance, and Phase Space Hazard models.</li>
          </ul>
          <p><strong>Pro Tip:</strong> Click the <strong>Info (i)</strong> button next to any advanced chart to read a detailed explanation of exactly what that chart means, how the math is calculated, and how you can use it to optimize your workflow!</p>
        </div>
      )
    },
    {
      title: "Troubleshooting & Customization",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem' }}>
          <p>FocusLog is highly customizable. If something isn't looking right, check these common settings:</p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>Visuals Missing:</strong> Ensure the charts are toggled ON in Settings &gt; Themes & UI. E.g., the Daily Sector Chart must be explicitly enabled to appear on the Timer.</li>
            <li><strong>Colors look wrong:</strong> You can set Master Tag Colors directly in the Settings &gt; Tags & Targets menu. The Daily Sector chart and Heatmaps respect these colors.</li>
            <li><strong>Data isn't logging:</strong> Ensure your LAN Server (backend) is running and your devices share the same IP/password if syncing across mobile.</li>
            <li><strong>App Background:</strong> Paste any web image URL into the "Custom URL" field in Settings to theme your app.</li>
            <li><strong>Resetting:</strong> You can completely wipe your database from the General settings tab if you want to start fresh (a local JSON backup is automatically generated just in case).</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ maxWidth: '750px', display: 'flex', flexDirection: 'column', padding: 0 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--md-sys-color-outline)' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={24} color="var(--md-sys-color-primary)" /> Feature Walkthrough & Manual
          </h2>
          <button className="icon-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: '32px', minHeight: '400px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--md-sys-color-primary)' }}>{slides[currentSlide].title}</h3>
          <div style={{ fontSize: '1rem', lineHeight: 1.6 }}>
            {slides[currentSlide].content}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--md-sys-color-outline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--md-sys-color-surface-variant)' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {slides.map((_, i) => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i === currentSlide ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="md-button md-button-secondary" 
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={18} /> Prev
            </button>
            <button 
              className="md-button" 
              onClick={() => {
                if (currentSlide === slides.length - 1) onClose();
                else setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1));
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'} <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const kbdStyle = {
  backgroundColor: 'var(--md-sys-color-surface)',
  color: 'var(--md-sys-color-on-surface)',
  padding: '2px 6px',
  borderRadius: '4px',
  border: '1px solid var(--md-sys-color-outline)',
  boxShadow: '0 2px 0 var(--md-sys-color-outline)',
  fontFamily: 'monospace',
  fontSize: '0.9rem',
  fontWeight: 'bold',
  display: 'inline-block'
};
