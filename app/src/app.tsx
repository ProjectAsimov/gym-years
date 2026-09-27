import { screens, sheet, top } from './lib/nav';
import { Home } from './screens/Home';
import { TaskScreen } from './screens/Task';
import { MonthScreen } from './screens/Month';
import { Settings } from './screens/Settings';
import { Welcome } from './screens/Welcome';
import { TaskForm } from './screens/TaskForm';
import { Toast } from './components/Toast';

export function App() {
  void screens.value; // subscribe
  const cur = top();
  const editingId = cur.name === 'home' ? undefined : cur.taskId;
  return (
    <>
      {cur.name === 'home' && <Home />}
      {cur.name === 'task' && <TaskScreen key={cur.taskId} taskId={cur.taskId} />}
      {cur.name === 'month' && <MonthScreen taskId={cur.taskId} y={cur.y} m={cur.m} />}
      <Settings open={sheet.value === 'settings'} />
      <Welcome open={sheet.value === 'welcome'} />
      <TaskForm open={sheet.value === 'add'} />
      <TaskForm open={sheet.value === 'edit'} taskId={editingId} />
      <Toast />
    </>
  );
}
