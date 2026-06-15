import React from 'react';
import { X, Info } from 'lucide-react';

const chartExplanations = {
  'heatmap': {
    title: 'Consistency Heatmap',
    content: 'Displays your focus consistency over the last year. Each square represents a day, and the color intensity corresponds to the total time spent focusing. Use this to build habits and identify long-term patterns in your productivity.'
  },
  'time-by-tag': {
    title: 'Time by Tag',
    content: 'A breakdown of your total focus time distributed across your custom tags. Helps you understand resource allocation (e.g., how much time you are spending on Math vs Physics).'
  },
  'time-of-day': {
    title: 'Time of Day Focus',
    content: 'Analyzes when you are most productive. It aggregates your sessions by the hour of the day. A peak in the morning indicates you are a morning person; use this to schedule your hardest tasks during your peak hours.'
  },
  'stress-energy': {
    title: 'Stress-Energy Correlation',
    content: 'Plots your self-reported Energy against Stress (if logged). A negative correlation (-1) means high stress drains your energy. A positive correlation (+1) might indicate eustress (productive stress). Watch for extreme negative values, which indicate burnout risk.'
  },
  'fatigue-curve': {
    title: 'Fatigue Curve (Cognitive Cliff)',
    content: 'This Bar chart visualizes distraction frequency across different session lengths (bucketed in 10-minute intervals). A sudden spike at a specific interval (e.g., 40-50m) is your "Cognitive Cliff"—the exact moment your focus collapses. You should schedule breaks right before this cliff.'
  },
  'efficiency-curves': {
    title: 'Efficiency Curves (Duration vs E)',
    content: 'Plots Session Duration vs Cognitive Expenditure (E). The slope of these scatter points indicates your focus decay rate. If long sessions have surprisingly low E, you are sitting at your desk but not actually absorbing information (high friction).'
  },
  'epistemic-endurance': {
    title: 'Epistemic Endurance & Distraction Rate',
    content: 'Breaks down your raw distraction rate per hour based on your Epistemic Stance. You will likely see that high-friction tasks (Symbol Manipulation) yield much higher distraction rates than low-friction tasks (Ingestion). This sets your baseline.'
  },
  'phase-space-hazard': {
    title: 'Phase Space Hazard Plot',
    content: 'An advanced survival analysis plot. It calculates the localized Hazard Rate (λ) of getting distracted at specific times during a session. Spikes here indicate systemic vulnerabilities in your focus pipeline. If λ spikes at 25 minutes, your brain is forcefully requesting a context switch.'
  },
  'dynamic-endurance': {
    title: 'Dynamic Endurance Baselines (τ)',
    content: 'Calculates your empirical stamina limit (τ) for each specific topic. For example, you might have a 45-minute limit for "Calculus" but a 90-minute limit for "Reading". The app uses these values to trigger Zeigarnik Interventions automatically.'
  },
  'session-gantt': {
    title: 'Session Gantt Chart',
    content: 'A timeline view of your study blocks over the given period. Useful for visualizing your study cadence, the density of your breaks, and how you interleave different subjects throughout the day.'
  },
  'interleaved-timeline': {
    title: 'Interleaved Timeline',
    content: 'Visualizes how frequently you switch between topics. Dense, varied colors mean you are successfully utilizing Algorithmic Interleaving, which cognitive science shows vastly improves long-term retention compared to monolithic block-studying.'
  },
  'cognitive-distance': {
    title: 'Cognitive Distance Matrix',
    content: 'A network or matrix representing the "distance" between your topics based on their epistemic friction. Topics with similar loads have short distances. The app uses this to ensure you do not jump between identical cognitive loads, preventing localized burnout.'
  },
  'retrieval-latency': {
    title: 'Retrieval Latency Trend',
    content: 'Plots how long it takes you (in seconds) to complete an Entry Ticket when returning to a topic. A downward trend proves that your Spaced Retrieval practice is working and your memory schema is getting stronger and faster to access.'
  },
  'kaplan-meier': {
    title: 'Focus Survival Probability (Kaplan-Meier)',
    content: 'A survival curve showing the probability of maintaining focus over time, segmented by Epistemic State. For example, at 30 minutes, the probability of surviving without distraction in "Ingestion" might be 80%, while "Symbolic" drops to 20%.'
  }
};

export default function ChartInfoModal({ chartId, onClose }) {
  if (!chartId || !chartExplanations[chartId]) return null;

  const info = chartExplanations[chartId];

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="md-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--md-sys-color-outline)' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--md-sys-color-primary)' }}>
            <Info size={20} /> {info.title}
          </h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div style={{ padding: '24px', fontSize: '1.05rem', lineHeight: '1.6' }}>
          {info.content}
        </div>
      </div>
    </div>
  );
}
