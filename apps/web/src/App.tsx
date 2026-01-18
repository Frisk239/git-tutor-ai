import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Git Tutor AI
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Phase 1: MVP Chat Foundation
        </p>
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={() => setCount((c) => c + 1)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Count is {count}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
