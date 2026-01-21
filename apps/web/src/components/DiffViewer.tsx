import React, { useState } from 'react';
import { SideBySide, Diff } from 'react-diff-viewer-continued';
import './DiffViewer.css';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  language: string;
  fileName?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldValue,
  newValue,
  language,
  fileName,
}) => {
  const [isSplitView, setIsSplitView] = useState<boolean>(true);

  const diffData: Diff[] = [
    {
      value: newValue,
      lines: newValue.split('\n').map((line, lineNumber) => ({
        type: 'default',
        content: line,
        lineNumber: lineNumber + 1,
        oldLineNumber: lineNumber + 1,
      })),
      language,
    },
  ];

  const originalData: Diff[] = [
    {
      value: oldValue,
      lines: oldValue.split('\n').map((line, lineNumber) => ({
        type: 'default',
        content: line,
        lineNumber: lineNumber + 1,
      })),
      language,
    },
  ];

  const renderToolbar = () => (
    <div className="diff-viewer-toolbar">
      {fileName && (
        <div className="diff-file-name">
          <strong>{fileName}</strong>
        </div>
      )}
      <div className="diff-view-mode-toggle">
        <button
          className={`mode-toggle-button ${!isSplitView ? 'active' : ''}`}
          onClick={() => setIsSplitView(false)}
        >
          统一视图
        </button>
        <button
          className={`mode-toggle-button ${isSplitView ? 'active' : ''}`}
          onClick={() => setIsSplitView(true)}
        >
          分栏视图
        </button>
      </div>
    </div>
  );

  return (
    <div className="diff-viewer-container">
      {renderToolbar()}
      <div className="diff-viewer-content">
        {isSplitView ? (
          <SideBySide
            leftTitle="原始文件"
            rightTitle="修改后文件"
            oldValue={originalData}
            newValue={diffData}
            splitView={true}
            useDarkTheme={true}
            hideFilters={false}
            hideLineNumbers={false}
            showDiffOnly={false}
            styles={{
              diffContainer: {
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                overflow: 'hidden',
              },
              diffGutter: {
                backgroundColor: '#2d2d2d',
              },
              content: {
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                fontSize: '14px',
                lineHeight: '1.5',
              },
              toolbar: {
                backgroundColor: '#2d2d2d',
                borderBottom: '1px solid #404040',
                padding: '8px 16px',
              },
              lineContent: {
                minHeight: '20px',
              },
              emptyGutter: {
                minWidth: '50px',
              },
              emptyContent: {
                paddingLeft: '50px',
              },
              additions: {
                backgroundColor: '#1e3a2e',
              },
              deletions: {
                backgroundColor: '#3d1f1f',
              },
              gutter: {
                minWidth: '50px',
                color: '#808080',
                textAlign: 'right',
                fontSize: '12px',
                padding: '0 8px',
                borderRight: '1px solid #404040',
              },
              line: {
                '&:hover': {
                  backgroundColor: '#2d2d2d',
                },
              },
              added: {
                backgroundColor: '#1e3a2e',
                '&:hover': {
                  backgroundColor: '#274737',
                },
              },
              removed: {
                backgroundColor: '#3d1f1f',
                '&:hover': {
                  backgroundColor: '#4a2828',
                },
              },
              connector: {
                backgroundColor: '#404040',
              },
              toolbarButton: {
                color: '#d4d4d4',
                backgroundColor: 'transparent',
                border: '1px solid #404040',
                borderRadius: '4px',
                padding: '4px 12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#404040',
                },
              },
              toolbarActiveButton: {
                backgroundColor: '#007acc',
                borderColor: '#007acc',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#005a9e',
                },
              },
            }}
          />
        ) : (
          <SideBySide
            leftTitle="修改内容"
            rightTitle=""
            oldValue={diffData}
            newValue={[]}
            splitView={false}
            useDarkTheme={true}
            hideFilters={false}
            hideLineNumbers={false}
            showDiffOnly={true}
            styles={{
              diffContainer: {
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                overflow: 'hidden',
              },
              diffGutter: {
                backgroundColor: '#2d2d2d',
              },
              content: {
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                fontSize: '14px',
                lineHeight: '1.5',
              },
              toolbar: {
                backgroundColor: '#2d2d2d',
                borderBottom: '1px solid #404040',
                padding: '8px 16px',
              },
              lineContent: {
                minHeight: '20px',
              },
              emptyGutter: {
                minWidth: '50px',
              },
              emptyContent: {
                paddingLeft: '50px',
              },
              additions: {
                backgroundColor: '#1e3a2e',
              },
              deletions: {
                backgroundColor: '#3d1f1f',
              },
              gutter: {
                minWidth: '50px',
                color: '#808080',
                textAlign: 'right',
                fontSize: '12px',
                padding: '0 8px',
                borderRight: '1px solid #404040',
              },
              line: {
                '&:hover': {
                  backgroundColor: '#2d2d2d',
                },
              },
              added: {
                backgroundColor: '#1e3a2e',
                '&:hover': {
                  backgroundColor: '#274737',
                },
              },
              removed: {
                backgroundColor: '#3d1f1f',
                '&:hover': {
                  backgroundColor: '#4a2828',
                },
              },
              connector: {
                backgroundColor: '#404040',
              },
              toolbarButton: {
                color: '#d4d4d4',
                backgroundColor: 'transparent',
                border: '1px solid #404040',
                borderRadius: '4px',
                padding: '4px 12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#404040',
                },
              },
              toolbarActiveButton: {
                backgroundColor: '#007acc',
                borderColor: '#007acc',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#005a9e',
                },
              },
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DiffViewer;