import React from 'react';

/**
 * Simple Solidity syntax highlighter for light theme
 * Returns JSX with syntax highlighting spans
 */
export function highlightSolidity(code: string): React.ReactNode {
  const keywords = [
    'contract', 'function', 'modifier', 'event', 'struct', 'enum',
    'mapping', 'if', 'else', 'for', 'while', 'return', 'require',
    'import', 'pragma', 'solidity', 'public', 'private', 'internal',
    'external', 'pure', 'view', 'payable', 'indexed', 'memory',
    'storage', 'calldata', 'bool', 'emit'
  ];

  const types = [
    'uint256', 'uint', 'int256', 'int', 'address', 'string',
    'bytes', 'bytes32', 'bool', 'IERC20', 'Initializable'
  ];

  // Simple tokenizer (can be improved with regex)
  const lines = code.split('\n');

  return (
    <div className="code-syntax">
      {lines.map((line, i) => {
        // Comment detection
        if (line.trim().startsWith('//')) {
          return <div key={i} className="comment">{line}</div>;
        }

        // Multi-line comment detection (simplified)
        if (line.includes('/*') || line.includes('*/') || line.trim().startsWith('*')) {
          return <div key={i} className="comment">{line}</div>;
        }

        // Simple word-by-word highlighting
        const tokens = line.split(/(\s+|[{}();,])/g);
        return (
          <div key={i}>
            {tokens.map((token, j) => {
              if (keywords.includes(token)) {
                return <span key={j} className="keyword">{token}</span>;
              }
              if (types.includes(token)) {
                return <span key={j} className="type">{token}</span>;
              }
              if (token.match(/^\d+$/)) {
                return <span key={j} className="number">{token}</span>;
              }
              if (token.startsWith('"') || token.startsWith("'")) {
                return <span key={j} className="string">{token}</span>;
              }
              return <span key={j}>{token}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}
