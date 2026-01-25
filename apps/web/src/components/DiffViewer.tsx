import { useState } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface DiffViewerProps {
  oldValue: string
  newValue: string
  language: string
  fileName: string
}

export function DiffViewer({ oldValue, newValue, language, fileName }: DiffViewerProps) {
  const [showOld, setShowOld] = useState(false)

  const darkMode = false // 可以根据主题设置来调整

  // 简单的差异检测
  const diffLines: { line: number; type: 'added' | 'removed' | 'unchanged'; content: string }[] = []
  const oldLines = oldValue.split('\n')
  const newLines = newValue.split('\n')

  let oldLineIndex = 0
  let newLineIndex = 0

  while (oldLineIndex < oldLines.length || newLineIndex < newLines.length) {
    const oldLine = oldLines[oldLineIndex] || ''
    const newLine = newLines[newLineIndex] || ''

    if (oldLine === newLine) {
      // 相同的行
      diffLines.push({
        line: oldLineIndex + 1,
        type: 'unchanged',
        content: oldLine
      })
      oldLineIndex++
      newLineIndex++
    } else if (oldLines.length > newLines.length || oldLineIndex < oldLines.length && oldLine < newLine) {
      // 旧的行被删除
      diffLines.push({
        line: oldLineIndex + 1,
        type: 'removed',
        content: oldLine
      })
      oldLineIndex++
    } else {
      // 新的行被添加
      diffLines.push({
        line: newLineIndex + 1,
        type: 'added',
        content: newLine
      })
      newLineIndex++
    }
  }

  const highlightedCode = diffLines.map(line => {
    let styledLine = line.content
    switch (line.type) {
      case 'added':
        styledLine = `+${styledLine}`
        break
      case 'removed':
        styledLine = `-${styledLine}`
        break
    }
    return styledLine
  }).join('\n')

  return (
    <div className="h-full flex flex-col">
      {/* Toggle buttons */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700">
        <div className="text-sm text-gray-500">
          {fileName} • {oldLines.length} 行 → {newLines.length} 行
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOld(!showOld)}
            className={`text-xs px-2 py-1 rounded ${
              showOld
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            查看原文件
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto p-4">
        <SyntaxHighlighter
          language={language || 'text'}
          style={darkMode ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {highlightedCode}
        </SyntaxHighlighter>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t dark:border-gray-700 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-100 dark:bg-red-900 rounded inline-block"></span>
          <span className="text-gray-600 dark:text-gray-400">已删除</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-100 dark:bg-green-900 rounded inline-block"></span>
          <span className="text-gray-600 dark:text-gray-400">已添加</span>
        </div>
      </div>
    </div>
  )
}