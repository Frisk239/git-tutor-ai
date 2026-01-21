import React from 'react'
import { FileTree } from './FileTree'
import { useFileTree } from '../hooks/useFileTree'
import { FileTreeProps } from '../types/file'

interface FileTreePanelProps extends Omit<FileTreeProps, 'files'> {
  refreshInterval?: number
}

export const FileTreePanel: React.FC<FileTreePanelProps> = ({
  rootPath,
  onFileSelect,
  selectedFile,
  refreshInterval = 30000,
}) => {
  const { files, loading, error, refresh } = useFileTree(rootPath, { refreshInterval })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading file tree...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <div className="text-red-500">Error loading files</div>
        <button
          onClick={refresh}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No files found</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-auto">
      <FileTree
        rootPath={rootPath}
        onFileSelect={onFileSelect}
        selectedFile={selectedFile}
        files={files}
      />
    </div>
  )
}