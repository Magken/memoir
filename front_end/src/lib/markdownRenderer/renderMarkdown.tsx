import { Children, Fragment, useMemo, type ReactNode } from 'react'
import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import { ChatCopyControl } from '../../components/chatParts/ChatCopyControl'
import { ThemeScroll } from '../../components/ThemeScroll'
import { useMarkdownChatChrome } from './markdownChatChrome'
import { MarkdownMermaidBlock } from './markdownMermaidBlock'
import { isWorkspacePathCite, splitWorkspacePathCites } from './workspacePathCites'

export type MarkdownPreviewDensity = 'doc' | 'chat'

function fencedLanguage(className?: string): string | null {
  const match = /language-(\S+)/.exec(className ?? '')
  return match?.[1] ?? null
}

/** Untagged fences have no language-* class; treat multiline as a block. */
function isCodeBlock(className: string | undefined, children: unknown): boolean {
  if (fencedLanguage(className) !== null) return true
  const text = Array.isArray(children)
    ? children.map((c) => (typeof c === 'string' ? c : '')).join('')
    : typeof children === 'string'
      ? children
      : ''
  return text.includes('\n')
}

/** Template / package ids the bot often quotes — style as chips, not shouty prose. */
function isIdChipText(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 64 || /\s/.test(t)) return false
  return (
    /^(?:iv|synth|mark|custom|pkg|tool|ph|topic|rollup|pack)\.[\w.-]+$/i.test(t) ||
    /\.v\d+$/i.test(t) ||
    /^pkg\.[\w.-]+$/i.test(t)
  )
}

function codeChildrenText(children: unknown): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === 'string' ? c : '')).join('')
  }
  return ''
}

function withPathCites(children: ReactNode, onClick?: (path: string) => void): ReactNode {
  if (!onClick) return children
  return Children.map(children, (child, i) => {
    if (typeof child !== 'string') return child
    const parts = splitWorkspacePathCites(child)
    if (parts.length === 1 && !parts[0]?.path) return child
    return parts.map((part, j) =>
      part.path ? (
        <button
          key={`${i}-${j}-${part.path}`}
          type="button"
          className="theme-md-chat__path-cite"
          onClick={() => onClick(part.path!)}
        >
          {part.t}
        </button>
      ) : (
        <Fragment key={`${i}-${j}`}>{part.t}</Fragment>
      ),
    )
  })
}

const docComponents: Components = {
  h1: ({ children }) => <h1 className="type-display-sm">{children}</h1>,
  h2: ({ children }) => <h2 className="type-title">{children}</h2>,
  h3: ({ children }) => <h3 className="type-label">{children}</h3>,
  p: ({ children }) => <p className="type-body-sm">{children}</p>,
  ul: ({ children }) => <ul className="theme-list">{children}</ul>,
  ol: ({ children }) => <ol className="theme-list theme-list--ordered">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="theme-markdown-renderer__blockquote">{children}</blockquote>
  ),
  hr: () => <hr className="theme-divider" />,
  table: ({ children }) => (
    <ThemeScroll axis="horizontal" rail="mini" className="theme-table-wrap">
      <table className="theme-table">{children}</table>
    </ThemeScroll>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th scope="col">{children}</th>,
  td: ({ children }) => <td>{children}</td>,
  // Unwrap default <pre> so fenced `code` can own the block chrome.
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...props }) => {
    const language = fencedLanguage(className)
    const isBlock = isCodeBlock(className, children)
    if (isBlock) {
      if (language === 'mermaid' || language === 'mmd') {
        return <MarkdownMermaidBlock>{children}</MarkdownMermaidBlock>
      }
      return (
        <pre className="theme-markdown-renderer__code-block">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      )
    }
    return (
      <code className="type-code" {...props}>
        {children}
      </code>
    )
  },
}

function ChatFenceBlock({
  language,
  className,
  children,
  props,
}: {
  language: string | null
  className?: string
  children: ReactNode
  props: Record<string, unknown>
}) {
  const text = codeChildrenText(children).replace(/\n$/, '')
  return (
    <div
      className="theme-md-chat__code-wrap"
      data-language={language || undefined}
    >
      <pre className="theme-markdown-renderer__code-block theme-md-chat__code-block">
        {language ? (
          <span className="theme-md-chat__code-lang type-caption" aria-hidden>
            {language}
          </span>
        ) : null}
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
      <ChatCopyControl text={text} className="theme-md-chat__code-copy" />
    </div>
  )
}

function makeChatComponents(onWorkspacePathClick?: (path: string) => void): Components {
  const cite = (children: ReactNode) => withPathCites(children, onWorkspacePathClick)
  return {
    h1: ({ children }) => <h1 className="theme-md-chat__h1">{cite(children)}</h1>,
    h2: ({ children }) => <h2 className="theme-md-chat__h2">{cite(children)}</h2>,
    h3: ({ children }) => <h3 className="theme-md-chat__h3">{cite(children)}</h3>,
    h4: ({ children }) => <h4 className="theme-md-chat__h3">{cite(children)}</h4>,
    p: ({ children }) => <p className="theme-md-chat__p">{cite(children)}</p>,
    li: ({ children }) => <li>{cite(children)}</li>,
    a: ({ href, children }) => (
      <a className="type-link theme-md-chat__a" href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className="theme-md-chat__strong">{cite(children)}</strong>,
    em: ({ children }) => <em className="theme-md-chat__em">{cite(children)}</em>,
    hr: () => <hr className="theme-divider theme-md-chat__hr" />,
    table: ({ children }) => (
      <div className="theme-md-chat__table-wrap">
        <table className="theme-md-chat__table">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => <th scope="col">{cite(children)}</th>,
    td: ({ children }) => <td>{cite(children)}</td>,
    ul: ({ children }) => (
      <ul className="theme-list theme-list--compact theme-md-chat__list">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="theme-list theme-list--ordered theme-list--compact theme-md-chat__list">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="theme-markdown-renderer__blockquote theme-md-chat__quote">
        {children}
      </blockquote>
    ),
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children, ...props }) => {
      const language = fencedLanguage(className)
      const isBlock = isCodeBlock(className, children)
      if (isBlock) {
        if (language === 'mermaid' || language === 'mmd') {
          return <MarkdownMermaidBlock>{children}</MarkdownMermaidBlock>
        }
        return (
          <ChatFenceBlock language={language} className={className} props={props}>
            {children}
          </ChatFenceBlock>
        )
      }
      const text = codeChildrenText(children).replace(/\n$/, '')
      const idChip = isIdChipText(text)
      if (onWorkspacePathClick && isWorkspacePathCite(text)) {
        return (
          <button
            type="button"
            className={['type-code', 'theme-md-chat__code', 'theme-md-chat__path-cite']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onWorkspacePathClick(text)}
          >
            {children}
          </button>
        )
      }
      return (
        <code
          className={['type-code', 'theme-md-chat__code', idChip ? 'theme-md-chat__code--id' : '']
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {children}
        </code>
      )
    },
  }
}

type MarkdownPreviewProps = {
  source: string
  className?: string
  /** `chat` — compact headings/tables for bubble speech (not document chrome). */
  density?: MarkdownPreviewDensity
}

export function MarkdownPreview({ source, className = '', density = 'doc' }: MarkdownPreviewProps) {
  const chat = density === 'chat'
  const chrome = useMarkdownChatChrome()
  const chatComponents = useMemo(
    () => makeChatComponents(chrome.onWorkspacePathClick),
    [chrome.onWorkspacePathClick],
  )
  return (
    <div
      className={[
        'theme-markdown-renderer__preview',
        chat ? 'theme-markdown-renderer__preview--chat' : 'prose-measure',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={chat ? chatComponents : docComponents}
      >
        {source}
      </Markdown>
    </div>
  )
}
