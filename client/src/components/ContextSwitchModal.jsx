export default function ContextSwitchModal({ proposedTopic, suggestedState, onAccept, onSnooze }) {
  return (
    <div className="modal-overlay">
      <div className="md-card modal-content" style={{ maxWidth: '400px' }}>
        <h2 style={{ color: 'var(--md-sys-color-error)', marginBottom: '8px' }}>Working memory depleted.</h2>
        <p style={{ color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '16px' }}>Pause current derivation. It is time to interleave topics to optimize schema retention.</p>
        <div style={{ padding: '16px', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: '8px', margin: '16px 0' }}>
          <div style={{ marginBottom: '8px' }}>Switch to: <strong style={{ fontSize: '1.2rem', color: 'var(--md-sys-color-primary)' }}>{proposedTopic}</strong></div>
          <div>Suggested State: <strong>{suggestedState}</strong></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button className="md-button-outline" onClick={onSnooze}>Snooze (5m)</button>
          <button className="md-button" onClick={onAccept}>Accept Switch</button>
        </div>
      </div>
    </div>
  );
}
