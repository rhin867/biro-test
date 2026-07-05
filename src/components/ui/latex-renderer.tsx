import React, { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import DOMPurify from 'dompurify';

interface LatexRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function LatexRenderer({ content, className = '', displayMode = false }: LatexRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    const displayLatex = /\$\$([^$]+)\$\$/g;
    const inlineLatex = /\$([^$]+)\$/g;

    // Placeholders keep KaTeX HTML out of the escape step
    const tokens: string[] = [];
    const stash = (html: string) => {
      const i = tokens.push(html) - 1;
      return `\u0000KTX${i}\u0000`;
    };

    let result = content.replace(displayLatex, (match, latex) => {
      try {
        return stash(katex.renderToString(latex, { throwOnError: false, displayMode: true, strict: false }));
      } catch {
        return escapeHtml(match);
      }
    });

    result = result.replace(inlineLatex, (match, latex) => {
      try {
        return stash(katex.renderToString(latex, { throwOnError: false, displayMode: false, strict: false }));
      } catch {
        return escapeHtml(match);
      }
    });

    // Escape all non-LaTeX text, then restore KaTeX HTML
    result = escapeHtml(result).replace(/\u0000KTX(\d+)\u0000/g, (_m, i) => tokens[Number(i)] || '');

    // Final defensive sanitization pass
    return DOMPurify.sanitize(result, { ADD_ATTR: ['aria-hidden'] });
  }, [content]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

// Simple text-only version for when LaTeX isn't needed
export function TextWithLatex({ text, className = '' }: { text: string; className?: string }) {
  const hasLatex = /\$[^$]+\$/.test(text);
  if (!hasLatex) {
    return <span className={className}>{text}</span>;
  }
  return <LatexRenderer content={text} className={className} />;
}
