import React from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import { FileNode, FileTreeItemProps } from '../types/file'

const FileTreeItem: React.FC<FileTreeItemProps> = ({ node, level, onSelect, isSelected }) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const hasChildren = node.children && node.children.length > 0

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'directory') {
      return isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
    }

    // File type icons using emojis
    const extension = node.extension?.toLowerCase()
    switch (extension) {
      case 'ts':
      case 'tsx':
        return <span className="text-blue-500">📄</span>
      case 'js':
      case 'jsx':
        return <span className="text-yellow-500">📄</span>
      case 'py':
        return <span className="text-green-500">🐍</span>
      case 'json':
        return <span className="text-orange-500">📋</span>
      case 'md':
        return <span className="text-purple-500">📝</span>
      case 'css':
        return <span className="text-pink-500">🎨</span>
      case 'html':
        return <span className="text-red-500">🌐</span>
      default:
        return <File size={16} />
    }
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleClick = () => {
    onSelect(node)
  }

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 py-1 px-2 cursor-pointer rounded
          hover:bg-gray-100 transition-colors
          ${isSelected ? 'bg-blue-100 text-blue-700' : ''}
        `}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}
        {getFileIcon(node)}
        <span className="text-sm">{node.name}</span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              isSelected={isSelected}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export interface FileTreeProps {
  rootPath: string
  onFileSelect: (path: string) => void
  selectedFile?: string
  files: FileNode[]
}

export const FileTree: React.FC<FileTreeProps> = ({ rootPath, onFileSelect, selectedFile, files }) => {
  const handleNodeSelect = (node: FileNode) => {
    onFileSelect(node.path)
  }

  return (
    <div className="text-sm">
      {files.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          level={0}
          onSelect={handleNodeSelect}
          isSelected={selectedFile === node.path}
        />
      ))}
    </div>
  )
}