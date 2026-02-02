import React from 'react';
import { useCurrentWeekWorkspace } from './useCurrentWeekWorkspace';
import { WORKDAYS } from '@/domain/types';

export default function CurrentWeekView() {
  const { loading, error, ws } = useCurrentWeekWorkspace();

  if (loading)
    return <div style={{ padding: 12, opacity: 0.75 }}>Loading week…</div>;
  if (error)
    return (
      <div style={{ padding: 12, color: 'crimson' }}>Load failed: {error}</div>
    );
  if (!ws) return <div style={{ padding: 12 }}>No workspace</div>;

  return (
    <div className="cwRoot">
      {/* 你可以把 contentHeader 也放到这个 view 里 */}
      <div className="contentHeader">
        <div>
          <div className="contentTitle">周总结</div>
          <div className="contentHint">{ws.title}</div>
        </div>

        <div className="contentActions">
          <button
            className="btnPrimary"
            onClick={() => console.log('Archive Today')}
          >
            Archive Today
          </button>
        </div>
      </div>

      <div className="cwGrid">
        <section className="cwLeft">
          {/* 左栏：技术债务 + 优先级 notes（你之后再接 workspace.notes） */}
          <div className="cwPanel">
            <div className="cwPanelTitle">技术债务</div>
            <div className="cwPanelBody">（TODO）</div>
          </div>

          <div className="cwPanel">
            <div className="cwPanelTitle">优先级</div>
            <div className="cwPanelBody">（TODO）</div>
          </div>
        </section>

        <section className="cwRight">
          {/* 右栏：Mon-Fri accordion */}
          <div className="cwAccordion">
            {WORKDAYS.map((d) => {
              const day = ws.days[d];
              const label = d; // 你可以映射成 Monday/周一

              return (
                <div key={d} className="cwDay">
                  <div className="cwDayHeader">
                    <div className="cwDayTitle">
                      {label} {day?.date ? `(${day.date})` : ''}
                    </div>

                    <div className="cwDayMeta">
                      {!day?.snapshotExists ? (
                        <span className="pill outline">Not archived</span>
                      ) : day.isOff ? (
                        <span className="pill outline">😴 Off</span>
                      ) : (
                        <span className="pill outline">
                          ✅ {day.changelog.completed.length} / ➕{' '}
                          {day.changelog.added.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 展开内容：先简单输出 */}
                  <div className="cwDayBody">
                    {!day?.snapshotExists ? (
                      <div style={{ opacity: 0.75 }}>No snapshot</div>
                    ) : day.isOff ? (
                      <div>😴 Day Off</div>
                    ) : (
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                        {JSON.stringify(day.changelog, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
