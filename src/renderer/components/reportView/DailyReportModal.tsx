import React, { useMemo } from 'react';

export default function DailyReportModal(props: {
  open: boolean;
  title: string;
  markdown: string;
  onClose: () => void;
}) {
  const { open, title, markdown, onClose } = props;
  const canCopy = useMemo(() => !!markdown, [markdown]);

  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose} aria-hidden>
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modalBody">
          <textarea className="modalTextArea" readOnly value={markdown} />
        </div>

        <div className="modalFooter">
          <button className="btnGhost" onClick={onClose}>
            Close
          </button>

          <button
            className="btnPrimary"
            disabled={!canCopy}
            onClick={async () => {
              await navigator.clipboard.writeText(markdown);
            }}
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
