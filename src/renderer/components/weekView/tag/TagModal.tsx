import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DayTag } from '@/domain/types';
import './tagModal.css';
import { LABEL } from '../CurrentWeekView';

export type TagModalValue = {
  day?: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  dateKey?: string; // "YYYY-MM-DD"
  // optional: current tag to prefill
  current?: DayTag | null;
};

const PRESETS: Array<{ type: string; label: string }> = [
  { type: 'ML', label: '😷 病假' },
  { type: 'AL', label: '🏖️ 年假' },
  { type: 'PH', label: '📅 公假' },
  { type: 'BT', label: '✈️ 出差' },
];

export default function TagModal(props: {
  value: TagModalValue;
  onClose: () => void;
  onConfirm: (tag: DayTag | null) => void; // null means clear tag
}) {
  const { value } = props;

  const initial = useMemo(() => {
    const cur = value.current ?? null;
    if (!cur) return { type: 'ML', custom: '' };
    if (cur.type === 'CUSTOM') {
      // "✏️ xxx" => keep xxx as custom text if you stored it separately, otherwise fallback
      const t = cur.label.replace(/^✏️\s*/i, '').trim();
      return { type: 'CUSTOM', custom: t };
    }
    return { type: cur.type, custom: '' };
  }, [value.current]);

  const [type, setKind] = useState(initial.type);
  const [custom, setCustom] = useState(initial.custom);

  const customRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setKind(initial.type);
    setCustom(initial.custom);
  }, [initial.type, initial.custom]);

  useEffect(() => {
    if (type === 'CUSTOM') {
      // focus input after opening
      setTimeout(() => customRef.current?.focus(), 0);
    }
  }, [type]);

  // Esc close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, custom]);

  const title = value.day
    ? `Tag for ${LABEL[value.day]}${value.dateKey ? ` (${value.dateKey})` : ''}`
    : 'Tag';

  const onConfirm = () => {
    if (type === 'CUSTOM') {
      const text = custom.trim().slice(0, 10);
      if (!text) return; // keep it strict: must type something
      props.onConfirm({ type: 'CUSTOM', label: text });
      return;
    }
    const preset = PRESETS.find((p) => p.type === type);
    if (!preset) return;
    props.onConfirm({ type, label: preset.label });
  };

  const onClear = () => props.onConfirm(null);

  return (
    <div
      className="tmBackdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={props.onClose}
    >
      <div className="tmCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tmRay" aria-hidden />
        <div className="tmHeader">
          <div className="tmTitle">{title}</div>
          <button
            className="tmIconBtn"
            onClick={props.onClose}
            title="Close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="tmBody">
          <div className="tmRow">
            <div className="tmLabel">Preset</div>
            <div className="tmChips">
              {PRESETS.map((p) => (
                <button
                  key={p.type}
                  className={`tmChip ${type === p.type ? 'active' : ''}`}
                  onClick={() => setKind(p.type)}
                  type="button"
                >
                  <span className="tmChipText">{p.label}</span>
                </button>
              ))}

              <button
                className={`tmChip ${type === 'CUSTOM' ? 'active' : ''}`}
                onClick={() => setKind('CUSTOM')}
                type="button"
              >
                <span className="tmChipText">✏️ 自定义</span>
              </button>
            </div>
          </div>

          {type === 'CUSTOM' ? (
            <div className="tmRow">
              <div className="tmLabel">Text</div>
              <input
                ref={customRef}
                className="tmInput"
                value={custom}
                maxLength={10}
                placeholder="≤ 10 chars"
                onChange={(e) => setCustom(e.target.value)}
              />
            </div>
          ) : null}

          <div className="tmHint">
            Hints: 如果没有工作进度可以用Tag备注。可以自定义 (字数≤10).
          </div>
        </div>

        <div className="tmFooter">
          <button className="tmBtn ghost" onClick={onClear} type="button">
            Clear
          </button>
          <div className="tmSpacer" />
          <button className="tmBtn ghost" onClick={props.onClose} type="button">
            Cancel
          </button>
          <button className="tmBtn primary" onClick={onConfirm} type="button">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
