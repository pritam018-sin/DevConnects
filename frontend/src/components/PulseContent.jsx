import React, { useState } from 'react';

const CodeBlock = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950/90 shadow-lg text-xs font-mono">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/70 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
            {language || 'code'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[10px] text-slate-300 hover:text-white transition cursor-pointer"
          title="Copy code"
        >
          <span className="material-symbols-outlined text-xs">
            {copied ? 'done' : 'content_copy'}
          </span>
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Editor Body with Line Numbers */}
      <div className="p-3 overflow-x-auto custom-scrollbar flex">
        <div className="select-none pr-3 text-slate-600 text-right font-mono text-[11px] leading-relaxed border-r border-slate-800/60 shrink-0">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="pl-3 text-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre overflow-x-auto flex-1">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const formatInlineText = (text, onTagClick) => {
  // Regex to match URLs, hashtags, or inline code `code`
  const tokenRegex = /(https?:\/\/[^\s]+)|(#[a-zA-Z0-9_-]+)|(`[^`]+`)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const [fullMatch, url, hashtag, inlineCode] = match;

    if (url) {
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
        >
          {url}
        </a>
      );
    } else if (hashtag) {
      parts.push(
        <button
          key={match.index}
          type="button"
          onClick={() => onTagClick && onTagClick(hashtag.substring(1))}
          className="text-cyan-400 hover:text-cyan-300 font-semibold inline-block hover:underline mx-0.5 cursor-pointer"
        >
          {hashtag}
        </button>
      );
    } else if (inlineCode) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs"
        >
          {inlineCode.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

const PulseContent = ({ content, onTagClick }) => {
  if (!content) return null;

  // Split by markdown fenced code blocks: ```[lang]?\n[code]\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      elements.push(
        <p
          key={`text-${lastIndex}`}
          className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap"
        >
          {formatInlineText(textBefore, onTagClick)}
        </p>
      );
    }

    const language = match[1] || '';
    const code = match[2] || '';

    elements.push(
      <CodeBlock
        key={`code-${match.index}`}
        language={language}
        code={code}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    elements.push(
      <p
        key={`text-${lastIndex}`}
        className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap"
      >
        {formatInlineText(remainingText, onTagClick)}
      </p>
    );
  }

  return <div className="flex flex-col gap-1">{elements}</div>;
};

export default PulseContent;
