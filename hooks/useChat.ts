import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part } from '@google/genai';
import { Message, MessageRole, ModelConfig, ModelType, GroundingSource } from '../types';

export function useChat(config: ModelConfig, apiKey: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const geminiChatRef = useRef<Chat | null>(null);
  const genAIRef = useRef<GoogleGenAI | null>(null); // Persist GenAI client instance

  useEffect(() => {
    setMessages([]); 
    setError(null);
    setIsLoading(false); // Reset loading state on config change

    if (!apiKey) {
      setError(`API Key (${config.apiKeyName}) is not configured. Please ensure it's set.`);
      return;
    }

    if (config.modelType === ModelType.GEMINI) {
      try {
        if (!genAIRef.current) { // Initialize GenAI client only if it doesn't exist
          genAIRef.current = new GoogleGenAI({ apiKey: apiKey });
        }
        const ai = genAIRef.current;
        
        const geminiChatConfig: { systemInstruction?: Content; tools?: any[]; history?: any[] } = {};
        
        // System instruction is only set if Google Search is NOT enabled.
        if (config.geminiSystemInstruction && !config.useGoogleSearch) {
           geminiChatConfig.systemInstruction = {role: "system", parts: [{text: config.geminiSystemInstruction}]};
        }
        
        if (config.useGoogleSearch) {
          geminiChatConfig.tools = [{ googleSearch: {} }];
          // Remove system instruction if search is enabled, as per guidelines
          delete geminiChatConfig.systemInstruction; 
        }

        geminiChatRef.current = ai.chats.create({
          model: config.modelNameApi,
          config: geminiChatConfig,
          // history: [] // Start with empty history for a new chat session on config change
        });
      } catch (e: any) {
        console.error(`Failed to initialize Gemini chat (${config.name}):`, e);
        setError(e.message || `Failed to initialize Gemini chat service for ${config.name}.`);
      }
    } else if (config.modelType === ModelType.OPENAI_COMPATIBLE) {
      if(!config.openaiBaseUrl) {
        setError(`OpenAI Base URL is not configured for ${config.name}.`);
      }
    }
  }, [config, apiKey]); // apiKey dependency added

  const sendMessage = useCallback(async (userInput: string) => {
    if (!apiKey) {
      setError(`Cannot send message: API Key (${config.apiKeyName}) is missing for ${config.name}.`);
      // Clear loading state for the message that was attempted
       setMessages(prev => prev.filter(msg => !msg.isLoading));
      return;
    }
    if (!userInput.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: MessageRole.USER,
      text: userInput,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    const modelMessageId = crypto.randomUUID();
    // Add a placeholder for the model's response
    setMessages(prev => [
      ...prev,
      { id: modelMessageId, role: MessageRole.MODEL, text: '', isLoading: true, error: undefined },
    ]);

    try {
      if (config.modelType === ModelType.GEMINI) {
        if (!geminiChatRef.current) {
          setError("Gemini chat is not initialized.");
          // throw new Error("Gemini chat is not initialized."); // This would be caught below
           setMessages(prev => prev.map(m => m.id === modelMessageId ? {...m, text: "Error: Chat not initialized.", isLoading: false, error: "Chat not initialized."} : m));
           setIsLoading(false);
           return;
        }
        // For Gemini, history is managed by the chat instance.
        // We pass only the new user input to sendMessageStream.
        const stream = await geminiChatRef.current.sendMessageStream({ message: userInput });
        let currentText = '';
        let currentGroundingSources: GroundingSource[] | undefined = undefined;

        for await (const chunk of stream) {
          const chunkText = chunk.text;
          if (chunkText) {
            currentText += chunkText;
          }
          
          const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
          if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
              currentGroundingSources = groundingMetadata.groundingChunks
                  .map(gc => ({
                      uri: gc.web?.uri || '',
                      title: gc.web?.title || '',
                  }))
                  .filter(gs => gs.uri && gs.uri.trim() !== '');
          }

          setMessages(prev =>
            prev.map(msg =>
              msg.id === modelMessageId
                ? { ...msg, text: currentText, isLoading: true, groundingSources: currentGroundingSources, error: undefined }
                : msg
            )
          );
        }
        setMessages(prev =>
          prev.map(msg =>
            msg.id === modelMessageId
              ? { ...msg, text: currentText, isLoading: false, error: undefined, groundingSources: currentGroundingSources }
              : msg
          )
        );

      } else if (config.modelType === ModelType.OPENAI_COMPATIBLE) {
        if (!config.openaiBaseUrl) {
           setMessages(prev => prev.map(m => m.id === modelMessageId ? {...m, text: "Error: OpenAI Base URL not configured.", isLoading: false, error: "OpenAI Base URL not configured."} : m));
           setIsLoading(false);
           setError(`OpenAI Base URL is not configured for ${config.name}.`);
           return;
        }
        
        const historyForOpenAI: {role: "system" | "user" | "assistant"; content: string}[] = [];
        if(config.openaiSystemInstruction) {
            historyForOpenAI.push({role: "system", content: config.openaiSystemInstruction});
        }

        // Construct history from current messages state, excluding the pending model message
        messages.filter(m => m.id !== modelMessageId && (m.role === MessageRole.USER || (m.role === MessageRole.MODEL && !m.isLoading && !m.error)))
          .forEach(msg => {
            historyForOpenAI.push({
              role: msg.role === MessageRole.USER ? 'user' : 'assistant',
              content: msg.text,
            });
        });
        // Add the current user message that triggered this call
        historyForOpenAI.push({role: 'user', content: userInput});

        console.log("OpenAIConfig", config);
        const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: config.modelNameApi,
            messages: historyForOpenAI,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          const detail = errorData?.error?.message || errorData?.message || JSON.stringify(errorData);
          throw new Error(`OpenAI API Error (${response.status}): ${detail}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const C_LINES_SEPARATOR = '\n\n';
          const C_DATA_PREFIX = 'data: ';

          let separatorIndex;
          while ((separatorIndex = buffer.indexOf(C_LINES_SEPARATOR)) !== -1) {
            const line = buffer.substring(0, separatorIndex);
            buffer = buffer.substring(separatorIndex + C_LINES_SEPARATOR.length);

            if (line.startsWith(C_DATA_PREFIX)) {
              const jsonData = line.substring(C_DATA_PREFIX.length).trim();
              if (jsonData === '[DONE]') {
                // reader.cancel(); // Signal completion to potentially break loop earlier if needed
                break; 
              }
              try {
                const chunk = JSON.parse(jsonData);
                const contentDelta = chunk.choices?.[0]?.delta?.content;
                if (contentDelta) {
                  currentText += contentDelta;
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === modelMessageId
                        ? { ...msg, text: currentText, isLoading: true, error: undefined }
                        : msg
                    )
                  );
                }
              } catch (e: any) {
                console.error(`Error parsing OpenAI stream chunk for ${config.name}:`, e, jsonData);
              }
            }
          }
           // Process potential last chunk without \n\n if it's not empty and not [DONE]
           if (buffer.startsWith(C_DATA_PREFIX)) { 
              const jsonData = buffer.substring(C_DATA_PREFIX.length).trim();
              if (jsonData && jsonData !== '[DONE]') { // Check if jsonData is not empty
                 try {
                    const chunk = JSON.parse(jsonData);
                    const contentDelta = chunk.choices?.[0]?.delta?.content;
                    if (contentDelta) {
                      currentText += contentDelta;
                      setMessages(prev =>
                        prev.map(msg =>
                          msg.id === modelMessageId
                            ? { ...msg, text: currentText, isLoading: true, error: undefined }
                            : msg
                        )
                      );
                    }
                  } catch (e) { /* Ignore incomplete JSON at the very end of stream */ }
              }
           }
           if(buffer.includes("[DONE]")) break; // Ensure loop terminates if [DONE] is seen in buffer
        }
         setMessages(prev =>
          prev.map(msg =>
            msg.id === modelMessageId
              ? { ...msg, text: currentText, isLoading: false, error: undefined }
              : msg
          )
        );
      }
    } catch (e: any) {
      console.error(`Error sending message to ${config.name}:`, e);
      const errorMessage = e.message || `Failed to get response from ${config.name}.`;
      setError(errorMessage); 
      setMessages(prev =>
        prev.map(msg =>
          msg.id === modelMessageId
            ? { ...msg, text: `Error: ${errorMessage}`, isLoading: false, error: errorMessage }
            : msg
        )//.filter(msg => !(msg.id === modelMessageId && msg.text === '' && !msg.error))
      );
    } finally {
      setIsLoading(false);
    }
  // OpenAI history needs `messages`. Gemini manages history internally once chat is initialized.
  // However, to ensure consistent behavior and re-composition for OpenAI, 'messages' is kept.
  // `config` is added so if system prompt changes for OpenAI, new history is built.
  // `apiKey` is crucial dependency now. `messages` is needed for OpenAI history.
  }, [config, apiKey, messages]); 

  return { messages, isLoading, error, sendMessage, setMessages };
}
