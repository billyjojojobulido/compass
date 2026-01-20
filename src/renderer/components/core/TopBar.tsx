import React from 'react';
import icon from 'assets/icon.png';

type Props = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
};

export default function TopBar({ onToggleSidebar, onOpenSettings }: Props) {
  return (
    <header className="topBar">
      <div className="topLeft">
        <button
          className="iconBtn sidebarToggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          ☰
        </button>

        <div className="logo" title="Compass">
          <img src={icon} alt="Compass" className="logoImg" />
          <div className="logoText">Compass</div>
        </div>
      </div>

      <div className="topCenter" />

      <div className="topRight">
        <button
          className="iconBtn"
          aria-label="Settings"
          title="Settings"
          onClick={onOpenSettings}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
