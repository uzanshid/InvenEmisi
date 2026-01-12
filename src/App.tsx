import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <Canvas />
    </div>
  );
}

export default App;
