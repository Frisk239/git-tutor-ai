import React from 'react'
import { FileNode } from '../types/file'

interface FileTreeComponentProps {
  files: FileNode[]
  onFileSelect: (path: string) => void
  selectedFile?: string
}

export const FileTree: React.FC<FileTreeComponentProps> = ({
  files,
  onFileSelect,
  selectedFile,
}) => {
  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>没有文件</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {files.map((file: FileNode) => (
        <div
          key={file.path}
          className={`px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
            selectedFile === file.path ? 'bg-blue-100 dark:bg-blue-900' : ''
          }`}
          onClick={() => onFileSelect(file.path)}
        >
          <span className="text-sm">{file.name}</span>
        </div>
      ))}
    </div>
  )
}