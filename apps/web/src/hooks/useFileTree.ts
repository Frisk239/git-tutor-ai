import { useState, useEffect, useCallback } from 'react'
import { FileNode } from '../types/file'

interface UseFileTreeOptions {
  refreshInterval?: number
  retryCount?: number
}

export const useFileTree = (
  rootPath: string,
  options: UseFileTreeOptions = {}
) => {
  const [files, setFiles] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Mock data for now - replace with API call in Task 6
      const mockFiles: FileNode[] = [
        {
          name: 'src',
          path: `${rootPath}/src`,
          type: 'directory',
          children: [
            {
              name: 'components',
              path: `${rootPath}/src/components`,
              type: 'directory',
              children: [
                {
                  name: 'Button.tsx',
                  path: `${rootPath}/src/components/Button.tsx`,
                  type: 'file',
                  extension: 'tsx'
                },
                {
                  name: 'Modal.tsx',
                  path: `${rootPath}/src/components/Modal.tsx`,
                  type: 'file',
                  extension: 'tsx'
                }
              ]
            },
            {
              name: 'utils',
              path: `${rootPath}/src/utils`,
              type: 'directory',
              children: [
                {
                  name: 'helpers.ts',
                  path: `${rootPath}/src/utils/helpers.ts`,
                  type: 'file',
                  extension: 'ts'
                }
              ]
            },
            {
              name: 'App.tsx',
              path: `${rootPath}/src/App.tsx`,
              type: 'file',
              extension: 'tsx'
            }
          ]
        },
        {
          name: 'package.json',
          path: `${rootPath}/package.json`,
          type: 'file',
          extension: 'json'
        },
        {
          name: 'README.md',
          path: `${rootPath}/README.md`,
          type: 'file',
          extension: 'md'
        }
      ]

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      setFiles(mockFiles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [rootPath])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    if (options.refreshInterval) {
      const interval = setInterval(fetchFiles, options.refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchFiles, options.refreshInterval])

  return {
    files,
    loading,
    error,
    refresh: fetchFiles
  }
}