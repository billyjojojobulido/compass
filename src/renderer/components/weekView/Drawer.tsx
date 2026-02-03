import React from 'react';

export default function Drawer(props: {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`drRoot ${props.className ?? ''}`}>
      <div
        className="drHeader"
        role="button"
        tabIndex={0}
        onClick={props.onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') props.onToggle();
        }}
      >
        {props.header}
      </div>

      {props.open ? <div className="drBody">{props.children}</div> : null}
    </section>
  );
}
