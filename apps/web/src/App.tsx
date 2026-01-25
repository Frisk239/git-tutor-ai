import { useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { SessionList } from './components/SessionList';

function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatPanelKey, setChatPanelKey] = useState(0);

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setChatPanelKey((prev) => prev + 1); // 重置 ChatPanel
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Git Tutor AI
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Phase 1: MVP Chat Foundation
        </p>
        <div className="bg-white rounded-lg shadow overflow-hidden flex" style={{ height: '600px' }}>
          <SessionList
            currentSessionId={currentSessionId}
            onSelectSession={setCurrentSessionId}
            onNewSession={handleNewSession}
          />
          <div className="flex-1">
            <ChatPanel key={chatPanelKey} initialSessionId={currentSessionId} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
