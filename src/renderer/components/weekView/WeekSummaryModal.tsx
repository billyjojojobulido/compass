export function WeekSummaryModal(props: {
  open: boolean;
  title: string;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSkip: () => void;
  onConfirm: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="modalOverlay" onMouseDown={props.onClose}>
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalTitle">{props.title}</div>
          <button
            className="iconBtn"
            onClick={props.onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modalBody">
          <textarea
            className="modalTextArea"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder="本周周总结（可留空）..."
          />
        </div>

        <div className="modalFooter">
          <button className="btnGhost" onClick={props.onSkip}>
            Skip
          </button>
          <button className="btnPrimary" onClick={props.onConfirm}>
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
