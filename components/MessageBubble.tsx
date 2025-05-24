import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, MessageRole } from '../types';
import LoadingSpinner from './LoadingSpinner';
import GroundingSourceDisplay from './GroundingSourceDisplay';

interface MessageBubbleProps {
  message: Message;
}

// Fix: Add interface for react-markdown 'code' component props
interface CodeRendererProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  // Allow any other props (like style, etc.) to be passed through
  [key: string]: any;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white self-end'
    : 'bg-gray-700 text-gray-100 self-start';

  return (
    <div
      className={`max-w-[85%] md:max-w-[75%] px-3 py-2 rounded-lg shadow ${bubbleClasses} ${isUser ? 'ml-auto' : 'mr-auto'} my-2`}
      role="article"
      aria-live={message.isLoading ? "polite" : "off"}
      aria-atomic="true"
    >
      <div className="break-words message-content"> {/* Removed whitespace-pre-wrap, Markdown handles it */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-3 break-words" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-bold my-2.5 break-words" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-semibold my-2 break-words" {...props} />,
            h4: ({node, ...props}) => <h4 className="text-base font-semibold my-1.5 break-words" {...props} />,
            h5: ({node, ...props}) => <h5 className="text-sm font-semibold my-1 break-words" {...props} />,
            h6: ({node, ...props}) => <h6 className="text-xs font-semibold my-1 break-words" {...props} />,
            p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 pl-4 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 pl-4 space-y-1" {...props} />,
            li: ({node, ...props}) => <li className="mb-1" {...props} />,
            pre: ({node, ...props}) => <pre className="bg-gray-800 p-3 rounded-md my-2 overflow-x-auto text-sm scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" {...props} />,
            // Fix: Apply CodeRendererProps type to the 'code' component arguments
            code: ({node, inline: isInline, className, children, ...props}: CodeRendererProps) => {
              if (isInline) {
                return <code className="bg-gray-600 px-1.5 py-0.5 rounded-sm text-sm mx-0.5" {...props}>{children}</code>;
              }
              // For block code, className will contain language-xxx if specified by Gemini/OpenAI
              // This code element is a child of the <pre> element handled by the 'pre' renderer above
              return <code className={`${className || ''} text-sm`} {...props}>{children}</code>;
            },
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-500 pl-4 italic my-2 py-1" {...props} />,
            table: ({node, ...props}) => <table className="table-auto w-full my-2 border border-collapse border-gray-600" {...props} />,
            thead: ({node, ...props}) => <thead className="bg-gray-750" {...props} />,
            th: ({node, ...props}) => <th className="border border-gray-500 px-3 py-1.5 text-left font-medium" {...props} />,
            td: ({node, ...props}) => <td className="border border-gray-500 px-3 py-1.5" {...props} />,
            hr: ({node, ...props}) => <hr className="border-gray-600 my-4" {...props}/>,
            img: ({node, src, alt, ...props}) => (
              <img 
                src={src} 
                alt={alt} 
                className="max-w-full h-auto rounded-md my-2" 
                loading="lazy"
                {...props} 
              />
            ),
          }}
        >
          {message.text}
        </ReactMarkdown>
        {message.isLoading && !message.text && <span className="italic text-gray-400 block mt-1">Generating response...</span>}
        {message.isLoading && message.text && (
            <div className="flex items-center mt-2">
                <LoadingSpinner />
                <span className="ml-2 text-xs text-gray-400 italic">Appending...</span>
            </div>
        )}
      </div>
      {message.error && (
        <p className="text-red-400 text-xs mt-2 pt-2 border-t border-red-700">Error: {message.error}</p>
      )}
      {!isUser && message.groundingSources && message.groundingSources.length > 0 && (
        <GroundingSourceDisplay sources={message.groundingSources} />
      )}
    </div>
  );
};

export default MessageBubble;