import React, { useState, useCallback } from 'react'
import { X, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileTab } from '@/types/file'
import MonacoEditor from './MonacoEditor'

interface CodeReaderPanelProps {
  className?: string
  maxTabs?: number
}

// Language detection mapping
const getLanguageFromExtension = (extension: string): string => {
  const extensionMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'md': 'markdown',
    'markdown': 'markdown',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'sql': 'sql',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'php': 'php',
    'rb': 'ruby',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'dockerfile': 'dockerfile',
    'dockerignore': 'dockerignore',
    'gitignore': 'gitignore',
    'env': 'ini',
    'ini': 'ini',
    'conf': 'ini',
    'config': 'ini',
    'log': 'plaintext',
    'txt': 'plaintext',
    '': 'plaintext',
  }

  return extensionMap[extension.toLowerCase()] || 'plaintext'
}

const CodeReaderPanel: React.FC<CodeReaderPanelProps> = ({
  className,
  maxTabs = 10,
}) => {
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [tabs, setTabs] = useState<FileTab[]>([])
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({})
  const [errorFiles, setErrorFiles] = useState<Record<string, string>>({})

  // Create a mock file content loader for now (will replace with API later)
  const loadFileContent = useCallback(async (filePath: string): Promise<string> => {
    // Simulate API call
    setLoadingFiles(prev => ({ ...prev, [filePath]: true }))

    try {
      // Mock API call - replace with actual API when available
      // const response = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
      // if (!response.ok) throw new Error('Failed to load file')
      // return response.text()

      // Mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 500))

      const mockContents: Record<string, string> = {
        'package.json': JSON.stringify({
          name: 'example-project',
          version: '1.0.0',
          dependencies: {
            react: '^18.0.0',
            typescript: '^5.0.0'
          }
        }, null, 2),
        'src/App.tsx': `import React from 'react'

function App() {
  return (
    <div className="App">
      <h1>Hello World</h1>
    </div>
  )
}

export default App
`,
        'README.md': `# Example Project

This is a demonstration of the code reader panel functionality.

## Features

- Monaco Editor integration
- Multi-file tabs
- Language detection
- Dark theme support
`,
      }

      const content = mockContents[filePath] || `// File content not found
// Path: ${filePath}`

      return content
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load file'
      setErrorFiles(prev => ({ ...prev, [filePath]: errorMessage }))
      throw errorMessage
    } finally {
      setLoadingFiles(prev => {
        const newLoadingFiles = { ...prev }
        delete newLoadingFiles[filePath]
        return newLoadingFiles
      })
    }
  }, [])

  const openFileInternal = useCallback(async (file: FileTab) => {
    // Check if file is already open
    const existingTab = tabs.find(tab => tab.path === file.path)

    if (existingTab) {
      setActiveTab(file.path)
      return
    }

    // Limit number of tabs
    if (tabs.length >= maxTabs) {
      // Remove the first tab (oldest)
      setTabs(prev => prev.slice(1).map(tab => ({
        ...tab,
        id: tab.path === prev[0].path ? Date.now().toString() : tab.id
      })))
    }

    // Load file content
    try {
      await loadFileContent(file.path)

      setTabs(prev => [
        ...prev,
        file
      ])
      setActiveTab(file.path)
    } catch (error) {
      // File failed to load, don't add to tabs
      console.error(`Failed to open file: ${file.path}`, error)
    }
  }, [tabs, maxTabs, loadFileContent])

  const closeFile = useCallback((filePath: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.path !== filePath)

      // If closing the active tab, activate the next one or none
      if (activeTab === filePath) {
        setActiveTab(
          newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null
        )
      }

      return newTabs
    })
  }, [activeTab])

  const clearErrors = useCallback((filePath: string) => {
    setErrorFiles(prev => {
      const newErrors = { ...prev }
      delete newErrors[filePath]
      return newErrors
    })
  }, [])

  // Close all tabs
  const closeAllTabs = useCallback(() => {
    setTabs([])
    setActiveTab(null)
    setErrorFiles({})
  }, [])

  // Get file name from path
  const getFileName = (path: string): string => {
    const parts = path.split('/')
    const fileName = parts[parts.length - 1]
    return fileName || path
  }

  // Get file extension from path
  const getFileExtension = (path: string): string => {
    const fileName = getFileName(path)
    const lastDot = fileName.lastIndexOf('.')
    return lastDot > 0 ? fileName.slice(lastDot + 1) : ''
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-900 text-gray-100', className)}>
      {/* Tabs Header */}
      <div className="flex items-center border-b border-gray-700 bg-gray-800 min-h-[40px]">
        <div className="flex-1 overflow-x-auto">
          <div className="flex items-center space-x-1 px-2">
            {tabs.length === 0 && (
              <div className="px-4 py-2 text-gray-400 text-sm">
                No files open. Select a file to read.
              </div>
            )}
            {tabs.map((tab) => {
              const fileExtension = getFileExtension(tab.path)

              return (
                <div
                  key={tab.id}
                  className={cn(
                    'flex items-center px-3 py-2 border border-gray-600 rounded-md cursor-pointer',
                    'hover:bg-gray-700 transition-colors',
                    'select-none text-sm',
                    activeTab === tab.path
                      ? 'bg-gray-700 border-gray-500'
                      : 'bg-gray-800 border-gray-700'
                  )}
                  onClick={() => setActiveTab(tab.path)}
                >
                  <File className="w-4 h-4 mr-2" />
                  <span className="mr-2">{getFileName(tab.path)}</span>
                  <span className="text-xs text-gray-400">.{fileExtension}</span>
                  <X
                    className="w-4 h-4 ml-2 hover:text-red-400 cursor-pointer"
                    onClick={(e) => closeFile(tab.path, e)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {tabs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={closeAllTabs}
            className="text-gray-400 hover:text-gray-200 hover:bg-gray-700"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab ? (
          <div className="h-full w-full">
            {loadingFiles[activeTab] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                <div className="text-gray-400">Loading...</div>
              </div>
            )}

            {errorFiles[activeTab] && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                <div className="text-red-400 mb-2">Error loading file</div>
                <div className="text-sm text-gray-400 mb-4">{errorFiles[activeTab]}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearErrors(activeTab)}
                >
                  Retry
                </Button>
              </div>
            )}

            <MonacoEditor
              value={tabs.find(tab => tab.path === activeTab)?.language
                ? `// File content will appear here\n// Language: ${tabs.find(tab => tab.path === activeTab)?.language}\n// Path: ${activeTab}`
                : '// File content will appear here\n// Path: ' + activeTab}
              language={getLanguageFromExtension(getFileExtension(activeTab))}
              theme="vs-dark"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-850">
            <div className="text-center text-gray-500">
              <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No File Selected</p>
              <p className="text-sm">Open a file to start reading code</p>
            </div>
          </div>
        )}
      </div>

      {/* External API Integration (for parent components) */}
    </div>
  )
}

// Add static method for external use
Object.assign(CodeReaderPanel, {
  openFile: openFileInternal
})

// Example usage - open a sample file when component mounts
if (typeof window !== 'undefined') {
  CodeReaderPanel.openFile({
    id: 'sample',
    path: 'README.md',
    name: 'README.md',
    language: 'markdown'
  })
}

export default CodeReaderPanel