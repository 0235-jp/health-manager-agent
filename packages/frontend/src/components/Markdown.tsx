import type { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className = '' }: MarkdownProps): ReactElement {
  const baseClassName = 'prose prose-sm max-w-none';
  const combinedClassName = className ? `${baseClassName} ${className}` : baseClassName;

  return (
    <div className={combinedClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
