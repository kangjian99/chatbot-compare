import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Message, ModelConfig, MessageRole, ModelType, ChatColumnHandle } from '../types';
import { useChat } from '../hooks/useChat'; // Import useChat
import MessageBubble from './MessageBubble';
import LoadingSpinner from './LoadingSpinner';

interface ChatColumnProps {
  config: ModelConfig;
  apiKey: string | undefined; // 接收 apiKey prop
  onLoadingChange: (configId: string, isLoading: boolean) => void; // To report loading state
  // Messages, isLoading, error are now managed internally by useChat
}

const ChatColumn = forwardRef<ChatColumnHandle, ChatColumnProps>(({ config, apiKey, onLoadingChange }, ref) => {
  const { messages, isLoading, error, sendMessage, setMessages } = useChat(config, apiKey);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(isLoading);

  // 修改后的 useEffect
  useEffect(() => {
    if (prevLoadingRef.current !== isLoading) {
      prevLoadingRef.current = isLoading;
      onLoadingChange(config.id, isLoading);
    }
  }, [isLoading, config.id, onLoadingChange]);
  
  // Expose sendMessage function to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessageFromParent: async (userInput: string) => {
      await sendMessage(userInput);
    },
    clearMessages: () => {
        setMessages([]);
    }
  }), [sendMessage, setMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  // Clear messages if config.id changes (e.g., entire model setup changes)
  // This is mostly for robustness, as useChat's internal useEffect already handles config changes.
  useEffect(() => {
    return () => {
        // Optional: could clear messages here if component unmounts due to config removal
        // setMessages([]); 
    }
  }, [config.id, setMessages]);


  let systemNote: string | null = null;
  if (config.modelType === ModelType.GEMINI) {
    if (config.useGoogleSearch) {
      systemNote = "Note: Google Search is enabled for this model.";
    } else if (config.geminiSystemInstruction) {
      systemNote = `System: ${config.geminiSystemInstruction.length > 60 ? config.geminiSystemInstruction.substring(0, 57) + '...' : config.geminiSystemInstruction}`;
    }
  } else if (config.modelType === ModelType.OPENAI_COMPATIBLE) {
    if (config.openaiSystemInstruction) {
      systemNote = `System: ${config.openaiSystemInstruction.length > 60 ? config.openaiSystemInstruction.substring(0, 57) + '...' : config.openaiSystemInstruction}`;
    }
  }


  return (
    <div className="flex flex-col h-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-3 bg-gray-750 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-center text-teal-400">{config.name} {config.modelNameApi}</h2>
        {systemNote && (
          <p className="text-xs text-gray-400 text-center italic mt-1" title={
            (config.modelType === ModelType.GEMINI && config.geminiSystemInstruction) || 
            (config.modelType === ModelType.OPENAI_COMPATIBLE && config.openaiSystemInstruction) || ''
          }>
            {systemNote}
          </p>
        )}
      </div>
      <div className="flex flex-col flex-grow p-4 space-y-2 overflow-y-auto">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {/* Show loading spinner if the last message was from user and global isLoading for this column is true */}
        {isLoading && messages.length > 0 && messages[messages.length-1]?.role === MessageRole.USER && !messages.find(m => m.isLoading && m.role === MessageRole.MODEL) && (
           <div className="self-start flex items-center p-3 rounded-lg shadow bg-gray-700 text-gray-100">
             <LoadingSpinner /> <span className="ml-2 italic">Waiting for response...</span>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {error && (
        <div className="p-3 bg-red-800 text-red-100 text-sm border-t border-red-700">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
    </div>
  );
});

export default ChatColumn;
