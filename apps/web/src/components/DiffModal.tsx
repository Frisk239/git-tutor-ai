import { X } from 'lucide-react'
import { DiffViewer } from './DiffViewer'

interface DiffModalProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  oldValue: string
  newValue: string
  language: string
  onApply?: () => void
}

export function DiffModal({
  isOpen,
  onClose,
  fileName,
  oldValue,
  newValue,
  language,
  onApply,
}: DiffModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">代码修改建议</h2>
            <p className="text-sm text-gray-500">{fileName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 overflow-hidden">
          <DiffViewer
            oldValue={oldValue}
            newValue={newValue}
            language={language}
            fileName={fileName}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
            取消
          </button>
          <button onClick={() => { onApply?.(); onClose(); }} className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded">
            应用修改
          </button>
        </div>
      </div>
    </div>
  )
}