interface ToolResultDisplayProps {
  tool: string
  result: any
}

export function ToolResultDisplay({ tool, result }: ToolResultDisplayProps) {
  const renderResult = () => {
    // 错误情况
    if (result && !result.success && result.error) {
      return (
        <div className="text-red-700">
          <div className="font-semibold">错误:</div>
          <div className="text-sm">{result.error}</div>
        </div>
      )
    }

    // 文件内容
    if (result && result.content !== undefined) {
      return (
        <div>
          <div className="font-semibold mb-2">文件内容:</div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
            {result.content}
          </pre>
        </div>
      )
    }

    // 文件列表
    if (result && result.files !== undefined) {
      return (
        <div>
          <div className="font-semibold mb-2">文件列表:</div>
          <ul className="list-disc list-inside text-sm space-y-1">
            {result.files.map((file: string, i: number) => (
              <li key={i} className="font-mono text-xs">{file}</li>
            ))}
          </ul>
        </div>
      )
    }

    // Git 状态
    if (result && result.status !== undefined) {
      return (
        <div>
          <div className="font-semibold mb-2">Git 状态:</div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs">
            {result.status}
          </pre>
        </div>
      )
    }

    // data 字段（ToolResult 结构）
    if (result && result.data !== undefined) {
      // 递归渲染 data
      return <ToolResultDisplay tool={tool} result={result.data} />
    }

    // 默认 JSON 显示
    return (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96">
        {JSON.stringify(result, null, 2)}
      </pre>
    )
  }

  return (
    <div className="my-2 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-700 font-semibold">✓ {tool} 执行成功</span>
      </div>
      {renderResult()}
    </div>
  )
}
