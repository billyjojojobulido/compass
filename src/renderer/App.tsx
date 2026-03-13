import React from 'react';
import AppShell from './components/core/AppShell';

/* -- Provider -- */
import { SprintProvider } from '@/domain/sprintStore';
import type { SprintState, UserConfig } from '@/domain/types';
import { sprintConfig } from '@/config/sprintConfig.ts';
/* -- Styles -- */
import '@/styles/global.css';
import '@/styles/layout.css';
import { SettingsProvider } from './services/settings/SettingsContext';

//#region MOCK DATA
const mockEpics = [
  {
    id: 'e1',
    title: 'Compass Start Guide',
    priorityId: 'P0',
    statusId: 'TODO',
  },
];

const mockTasksById = {
  t1: {
    id: 't1',
    epicId: 'e1',
    title: 'Create Your First Epic',
    statusId: 'TODO',
    stakeholderId: 'ME',
  },
  t2: {
    id: 't2',
    epicId: 'e1',
    title: 'Create Your First Task',
    statusId: 'TODO',
    stakeholderId: 'ME',
  },
  t3: {
    id: 't3',
    epicId: 'e1',
    title: 'Try To Drag Your Task',
    statusId: 'TODO',
    stakeholderId: 'ME',
  },
  t4: {
    id: 't4',
    epicId: 'e1',
    title: 'Try To Update Something',
    statusId: 'TODO',
    stakeholderId: 'ME',
  },
};

const mockTaskOrderByEpic = {
  e1: ['t1', 't2', 't3', 't4'],
};
//#endregion

// TODO: in future config loading
// const config = await ipcRenderer.invoke("read-sprint-config");

const initialState: SprintState = {
  config: sprintConfig,
  epics: mockEpics,
  tasksById: mockTasksById,
  taskOrderByEpic: mockTaskOrderByEpic,
  events: [],
};

export default function App(props: { initialSettings?: UserConfig }) {
  if (!props.initialSettings) {
    return <div>Failed to load settings.</div>;
  }
  return (
    <SettingsProvider initialSettings={props.initialSettings}>
      <SprintProvider initialState={initialState}>
        <AppShell />
      </SprintProvider>
    </SettingsProvider>
  );
}
