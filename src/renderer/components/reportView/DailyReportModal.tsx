import React, { useEffect, useMemo, useRef, useState } from 'react';
import './dailyReportModal.css';
export default function DailyReportModal(props: {
  open: boolean;
  title: string;
  markdown: string;
  onClose: () => void;
  onCopied?: () => void; // optional: hook to your toast system
}) {
  const { open, title, markdown, onClose, onCopied } = props;

  const canCopy = useMemo(() => markdown.trim().length > 0, [markdown]);
  const [copied, setCopied] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // focus modal for keyboard use
    const t = setTimeout(() => {
      textRef.current?.focus();
      textRef.current?.select();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();

      // Cmd/Ctrl + C -> copy whole markdown (when modal open)
      const isCopy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
      if (isCopy && canCopy) {
        // allow default copy if user is selecting partial text in textarea
        // if selection is empty, we copy all
        const el = textRef.current;
        const hasSelection =
          el &&
          el.selectionStart !== el.selectionEnd &&
          el.selectionEnd > el.selectionStart;

        if (!hasSelection) {
          e.preventDefault();
          void doCopy();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canCopy, markdown]);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
  }, [open, markdown]);

  async function doCopy() {
    if (!canCopy) return;

    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    onCopied?.();

    // reset after a short moment
    window.setTimeout(() => setCopied(false), 1200);
  }

  if (!open) return null;

  return (
    <div
      className="drmOverlay"
      role="presentation"
      onMouseDown={(e) => {
        // click overlay to close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="drmCard"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={cardRef}
      >
        <div className="drmHeader">
          <div className="drmHeaderLeft">
            <div className="drmTitle">{title}</div>
            <div className="drmSub">
              Markdown preview •{' '}
              <span className="drmHint">Cmd/Ctrl+C to copy</span> • Esc to close
            </div>
          </div>

          <button className="drmIconBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="drmBody">
          <textarea
            ref={textRef}
            className="drmTextarea"
            readOnly
            value={markdown}
            spellCheck={false}
          />
        </div>

        <div className="drmFooter">
          <div className="drmFooterLeft">
            <button
              className="btnGhost"
              onClick={() => textRef.current?.select()}
            >
              Select all
            </button>
          </div>

          <div className="drmFooterRight">
            <button className="btnGhost" onClick={onClose}>
              Close
            </button>

            <button
              className="btnPrimary"
              disabled={!canCopy}
              onClick={() => void doCopy()}
            >
              {copied ? '✅ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
