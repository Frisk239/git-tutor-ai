import { ChatPanel } from './components/ChatPanel';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Git Tutor AI
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Phase 1: MVP Chat Foundation
        </p>
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
