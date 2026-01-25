import { useState, useRef } from 'react';
import { FileTreePanel } from './components/FileTreePanel';
import { CodeReaderPanel, type CodeReaderPanelRef } from './components/CodeReaderPanel';
import { ChatPanel } from './components/ChatPanel';

function App() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const codeReaderRef = useRef<CodeReaderPanelRef>(null);

  // Working directory (will be configurable later)
  const rootPath = '.'; // Current working directory

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
    // Open file in code reader
    codeReaderRef.current?.openFile({
      id: filePath,
      path: filePath,
      name: filePath.split('/').pop() || filePath,
      language: filePath.split('.').pop() || ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">Git Tutor AI</h1>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Tree (256px) */}
        <div className="w-64 border-r bg-white flex flex-col">
          <div className="p-3 border-b">
            <h2 className="text-sm font-semibold text-gray-700">文件树</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <FileTreePanel
              rootPath={rootPath}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile || undefined}
            />
          </div>
        </div>

        {/* Center: Code Reader (flex-1) */}
        <div className="flex-1">
          <CodeReaderPanel ref={codeReaderRef} />
        </div>

        {/* Right: Chat Panel (384px) */}
        <div className="w-96 border-l">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}

export default App;