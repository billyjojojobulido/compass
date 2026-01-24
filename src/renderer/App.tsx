import React from 'react';
import AppShell from './components/core/AppShell';

/* -- Provider -- */
import { SprintProvider } from '@/domain/sprintStore';
import type { SprintState } from '@/domain/types';
import { sprintConfig } from '@/config/sprintConfig.ts';
/* -- Styles -- */
import '@/styles/global.css';
import '@/styles/layout.css';

//#region MOCK DATA
const mockEpics = [
  { id: 'e1', title: 'UIv3', priorityId: 'P0', statusId: 'WIP' },
  { id: 'e2', title: 'Lobby Refresh', priorityId: 'P1', statusId: 'QA' },
  {
    id: 'e3',
    title: 'Tech Debt Cleanup',
    priorityId: 'P2',
    statusId: 'TODO',
  },
];

const mockTasksById = {
  t1: {
    id: 't1',
    epicId: 'e1',
    title: 'Game Of Queen – Implement core UI',
    statusId: 'WIP',
    stakeholderId: 'ME',
  },
  t2: {
    id: 't2',
    epicId: 'e1',
    title: 'Game Of King – Waiting for final art assets (icons + background)',
    statusId: 'BLOCKED',
    stakeholderId: 'ART',
  },
  t3: {
    id: 't3',
    epicId: 'e1',
    title: 'Integrate i18n copy',
    statusId: 'TODO',
    stakeholderId: 'COPY',
  },

  t4: {
    id: 't4',
    epicId: 'e2',
    title: 'Lobby layout polish',
    statusId: 'QA',
    stakeholderId: 'QA',
  },
  t5: {
    id: 't5',
    epicId: 'e2',
    title: 'Fix iPad scaling regression when rotating device orientation',
    statusId: 'WIP',
    stakeholderId: 'DEV',
  },
  t6: {
    id: 't6',
    epicId: 'e2',
    title: 'Main menu animation cleanup',
    statusId: 'DONE',
  },

  t7: {
    id: 't7',
    epicId: 'e3',
    title: 'Remove redundant getComponent calls via @property injection',
    statusId: 'TODO',
    stakeholderId: 'ME',
  },
};

const mockTaskOrderByEpic = {
  e1: ['t1', 't2', 't3'],
  e2: ['t4', 't5', 't6'],
  e3: ['t7'],
};
//#endregion

// TODO: in future config loading
// const config = await ipcRenderer.invoke("read-sprint-config");

console.log('baocheng', sprintConfig);

const initialState: SprintState = {
  config: sprintConfig,
  epics: mockEpics,
  tasksById: mockTasksById,
  taskOrderByEpic: mockTaskOrderByEpic,
  events: [],
};

export default function App() {
  return (
    <SprintProvider initialState={initialState}>
      <AppShell />
    </SprintProvider>
  );
}
