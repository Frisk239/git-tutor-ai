interface ToolCallDisplayProps {
  tool: string
  args: Record<string, any>
  status?: 'calling' | 'success' | 'error'
}

export function ToolCallDisplay({ tool, args, status = 'calling' }: ToolCallDisplayProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'calling':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'calling':
        return '⏳'
      case 'success':
        return '✓'
      case 'error':
        return '✗'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'calling':
        return '执行中...'
      case 'success':
        return '完成'
      case 'error':
        return '失败'
    }
  }

  return (
    <div className={`my-2 p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="font-semibold">{tool}</span>
        <span className="text-xs opacity-75">
          {getStatusText()}
        </span>
      </div>

      <div className="text-sm">
        <div className="font-medium mb-1">参数:</div>
        <pre className="bg-white bg-opacity-50 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>
    </div>
  )
}
