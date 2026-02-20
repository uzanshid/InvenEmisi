import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { WelcomeOverlay } from './components/WelcomeOverlay';

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <Canvas />
      <WelcomeOverlay />
    </div>
  );
}

export default App;
