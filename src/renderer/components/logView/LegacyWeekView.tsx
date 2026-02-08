import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './legacyWeekView.css';
import { apiClient } from '@/services/ApiClient';

export default function LegacyWeekView({
  fileName,
  onChangeNav,
}: {
  fileName: string;
  onChangeNav: (key: string) => void;
}) {
  const [md, setMd] = useState<string>('Loading...');

  useEffect(() => {
    let alive = true;

    setMd('Loading...');

    console.log('[LegacyWeekView]: reading fileName: ', fileName);

    apiClient.legacyWeekly
      .read(fileName)
      .then((txt: string) => {
        if (!alive) return;
        setMd(txt);
      })
      .catch((e) => {
        if (!alive) return;
        setMd(`Failed to load: ${String(e)}`);
      });

    return () => {
      alive = false;
    };
  }, [fileName]);

  return (
    <>
      <div className="contentHeader">
        <div>
          <div className="contentTitle">历史周总结</div>
          <div className="contentHint">History Weekly Reports</div>
        </div>

        {/* button area on Top Right */}
        <div className="contentActions">
          <button className="btnGhost" onClick={() => onChangeNav('周总结')}>
            Back to This Week
          </button>
        </div>
      </div>
      <div className="legacyWeekRoot">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // customize checkbox styles to look similar to MacOS Notes app
            input({ checked, ...props }) {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="memoCheckbox"
                />
              );
            },
          }}
        >
          {md}
        </ReactMarkdown>
      </div>
    </>
  );
}
