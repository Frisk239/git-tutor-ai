export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  extension?: string
}

export interface FileTreeProps {
  rootPath: string
  onFileSelect: (path: string) => void
  selectedFile?: string
}

export interface FileTreeItemProps {
  node: FileNode
  level: number
  onSelect: (node: FileNode) => void
  isSelected: boolean
}

export interface FileTab {
  id: string
  path: string
  name: string
  language: string
}