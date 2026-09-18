import React from 'react'

/**
 * Helper untuk mem-parsing format inline: bold (**text**), italic (*text*), code (`text`), strikethrough (~~text~~)
 */
function parseInline(text: string): React.ReactNode[] {
  // Regex untuk menangkap **bold**, *italic*, `code`, ~~strikethrough~~
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          style={{
            background: 'rgba(0, 0, 0, 0.05)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9em',
          }}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return <del key={index}>{part.slice(2, -2)}</del>
    }
    return part
  })
}

interface MarkdownContentProps {
  content: string
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  if (!content) return null

  // Pisahkan berdasarkan baris
  const rawLines = content.split('\n')
  const nodes: React.ReactNode[] = []

  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        nodes.push(
          <ul key={`ul-${nodes.length}`} style={{ margin: '6px 0', paddingLeft: '20px' }}>
            {currentList.items.map((item, i) => (
              <li key={i} style={{ margin: '3px 0' }}>{item}</li>
            ))}
          </ul>
        )
      } else {
        nodes.push(
          <ol key={`ol-${nodes.length}`} style={{ margin: '6px 0', paddingLeft: '20px' }}>
            {currentList.items.map((item, i) => (
              <li key={i} style={{ margin: '3px 0' }}>{item}</li>
            ))}
          </ol>
        )
      }
      currentList = null
    }
  }

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx]
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      continue
    }

    // Bullet list (* item, - item)
    const bulletMatch = line.match(/^(\s*)(?:[-*+])\s+(.+)$/)
    if (bulletMatch) {
      const itemContent = parseInline(bulletMatch[2])
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(itemContent)
      } else {
        flushList()
        currentList = { type: 'ul', items: [itemContent] }
      }
      continue
    }

    // Numbered list (1. item, 2. item)
    const numberMatch = line.match(/^(\s*)(?:\d+)[.)]\s+(.+)$/)
    if (numberMatch) {
      const itemContent = parseInline(numberMatch[2])
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(itemContent)
      } else {
        flushList()
        currentList = { type: 'ol', items: [itemContent] }
      }
      continue
    }

    flushList()

    // Heading (###, ##, #)
    if (trimmed.startsWith('### ')) {
      nodes.push(
        <h4 key={`h4-${idx}`} style={{ margin: '8px 0 4px', fontSize: '14px', fontWeight: 700 }}>
          {parseInline(trimmed.slice(4))}
        </h4>
      )
      continue
    }
    if (trimmed.startsWith('## ')) {
      nodes.push(
        <h3 key={`h3-${idx}`} style={{ margin: '10px 0 5px', fontSize: '15px', fontWeight: 700 }}>
          {parseInline(trimmed.slice(3))}
        </h3>
      )
      continue
    }
    if (trimmed.startsWith('# ')) {
      nodes.push(
        <h2 key={`h2-${idx}`} style={{ margin: '12px 0 6px', fontSize: '16px', fontWeight: 700 }}>
          {parseInline(trimmed.slice(2))}
        </h2>
      )
      continue
    }

    // Regular paragraph / text line
    nodes.push(
      <p key={`p-${idx}`} style={{ margin: '4px 0', lineHeight: '1.55' }}>
        {parseInline(line)}
      </p>
    )
  }

  flushList()

  return <div className="markdown-render-body">{nodes}</div>
}
