declare module 'react-syntax-highlighter' {
  import * as React from 'react'

  interface SyntaxHighlighterProps {
    children: React.ReactNode
    language?: string
    style?: any
    customStyle?: React.CSSProperties
    className?: string
    showLineNumbers?: boolean
    wrapLines?: boolean
    wrapLongLines?: boolean
    startingLineNumber?: number
    lineId?: string
    codeTagProps?: any
    useInlineStyles?: boolean
    renderer?: any
    useInlineStyles?: boolean
  }

  function SyntaxHighlighter(props: SyntaxHighlighterProps): React.ReactElement
  export default SyntaxHighlighter
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export default any
}