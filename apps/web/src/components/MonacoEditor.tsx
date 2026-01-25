import React from 'react'
import Editor from '@monaco-editor/react'
import { cn } from '@/lib/utils'

interface MonacoEditorProps {
  value: string
  language?: string
  theme?: 'vs' | 'vs-dark'
  className?: string
  options?: any
  onChange?: (value: string | undefined) => void
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language = 'plaintext',
  theme = 'vs-dark',
  className,
  options = {},
  onChange,
}) => {
  const defaultOptions: MonacoEditorProps['options'] = {
    fontSize: 14,
    minimap: { enabled: false },
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    readOnly: true,
    lineNumbers: 'on',
    folding: true,
    renderWhitespace: 'boundary',
    tabSize: 2,
    ...options,
  }

  const handleEditorDidMount = (editor: any) => {
    // Optional: Additional editor setup after mount
    editor.focus()
  }

  const handleEditorChange = (value: string | undefined) => {
    if (onChange) {
      onChange(value || '')
    }
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      <Editor
        height="100%"
        language={language}
        theme={theme}
        value={value}
        options={defaultOptions}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
      />
    </div>
  )
}

export default MonacoEditor