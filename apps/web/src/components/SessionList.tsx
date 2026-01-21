import { formatDistanceToNow } from 'date-fns';
import { useSessions } from '../hooks/useSessions';

export function SessionList({
  currentSessionId,
  onSelectSession,
  onNewSession,
}: {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}) {
  const { sessions, loading, deleteSession } = useSessions();

  return (
    <div className="w-64 bg-gray-50 border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <button
          onClick={onNewSession}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
        >
          + 新对话
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-400 text-sm">加载中...</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-gray-400 text-sm">暂无对话</div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={
                  'group relative p-3 rounded-lg cursor-pointer transition-colors ' +
                  (currentSessionId === session.id
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100')
                }
                onClick={() => onSelectSession(session.id)}
              >
                <div className="font-medium text-sm truncate">
                  {session.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {session.messageCount} 条消息
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(session.updatedAt), {
                    addSuffix: true,
                  })}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定删除这个对话吗？')) {
                      deleteSession(session.id);
                    }
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
