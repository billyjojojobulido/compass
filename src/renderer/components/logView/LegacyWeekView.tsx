import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './legacyWeekView.css';
import { readLegacyWeekly } from '@/domain/legacy/api';

export default function LegacyWeekView({ fileName }: { fileName: string }) {
  const [md, setMd] = useState<string>('Loading...');

  useEffect(() => {
    let alive = true;

    setMd('Loading...');

    console.log('fileName: ', fileName);

    readLegacyWeekly(fileName)
      .then((txt) => {
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
    <div className="legacyWeekRoot">
      {/* <pre className="legacyWeekPre">{md}</pre> */}

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
  );
}
