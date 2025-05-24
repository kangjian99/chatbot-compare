import { GoogleGenAI, GenerateContentResponse, Content, Chat } from '@google/genai';
import { ModelConfig, ModelType, GroundingSource, Message, MessageRole } from './types';

// Helper to convert app's message history to Gemini's format
const convertToGeminiHistory = (chatHistory: Message[]): Content[] => {
  return chatHistory.map(msg => ({
    role: msg.role === MessageRole.USER ? 'user' : 'model', // Gemini uses 'model' for assistant
    parts: [{ text: msg.text }],
  }));
};

// Helper to convert app's message history to OpenAI's format
const convertToOpenAIHistory = (
    chatHistory: Message[],
    systemInstruction?: string
): { role: "system" | "user" | "assistant"; content: string }[] => {
    const history: {role: "system" | "user" | "assistant"; content: string}[] = [];
    if (systemInstruction) {
        history.push({ role: "system", content: systemInstruction });
    }
    chatHistory.forEach(msg => {
        history.push({
            role: msg.role === MessageRole.USER ? 'user' : 'assistant',
            content: msg.text,
        });
    });
    return history;
};


export async function* streamChatResponse(
  config: ModelConfig,
  apiKey: string,
  userInput: string,
  chatHistoryMessages: Message[] // Pass the app's Message[] array
): AsyncGenerator<{ textChunk?: string; groundingSources?: GroundingSource[]; error?: string; isFinal?: boolean }, void, undefined> {
  if (!apiKey) {
    yield { error: `API Key (${config.apiKeyName}) is missing.`, isFinal: true };
    return;
  }

  if (config.modelType === ModelType.GEMINI) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const geminiModelConfig: { systemInstruction?: Content; tools?: any[] } = {};
      
      if (config.geminiSystemInstruction && !config.useGoogleSearch) {
         geminiModelConfig.systemInstruction = {role: "system", parts: [{text: config.geminiSystemInstruction}]};
      }
      if (config.useGoogleSearch) {
        geminiModelConfig.tools = [{ googleSearch: {} }];
        delete geminiModelConfig.systemInstruction; 
      }

      const historyForGemini = convertToGeminiHistory(chatHistoryMessages);
      
      // Create a chat session for each call, using the provided history.
      // This simulates a stateless backend API call that reconstructs context.
      const chat: Chat = ai.chats.create({
        model: config.modelNameApi,
        config: geminiModelConfig,
        history: historyForGemini,
      });

      const stream = await chat.sendMessageStream({ message: userInput });
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        let currentGroundingSources: GroundingSource[] | undefined = undefined;
        
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
            currentGroundingSources = groundingMetadata.groundingChunks
                .map(gc => ({
                    uri: gc.web?.uri || '',
                    title: gc.web?.title || '',
                }))
                .filter(gs => gs.uri && gs.uri.trim() !== '');
        }
        yield { textChunk: chunkText, groundingSources: currentGroundingSources };
      }
      yield { isFinal: true };
    } catch (e: any) {
      console.error(`Gemini API error in serverApi for ${config.name}:`, e);
      yield { error: e.message || `Failed to get response from ${config.name}.`, isFinal: true };
    }
  } else if (config.modelType === ModelType.OPENAI_COMPATIBLE) {
    if (!config.openaiBaseUrl) {
        yield { error: `OpenAI Base URL not configured for ${config.name}.`, isFinal: true };
        return;
    }

    const historyForOpenAI = convertToOpenAIHistory(chatHistoryMessages, config.openaiSystemInstruction);
    // Add current user input to the history for the API call
    historyForOpenAI.push({role: 'user', content: userInput});
    
    try {
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
        const C_LINES_SEPARATOR = '\n\n';
        const C_DATA_PREFIX = 'data: ';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          let separatorIndex;
          while ((separatorIndex = buffer.indexOf(C_LINES_SEPARATOR)) !== -1) {
            const line = buffer.substring(0, separatorIndex);
            buffer = buffer.substring(separatorIndex + C_LINES_SEPARATOR.length);

            if (line.startsWith(C_DATA_PREFIX)) {
              const jsonData = line.substring(C_DATA_PREFIX.length).trim();
              if (jsonData === '[DONE]') {
                 yield { isFinal: true };
                 return; // End generation
              }
              try {
                const chunk = JSON.parse(jsonData);
                const contentDelta = chunk.choices?.[0]?.delta?.content;
                if (contentDelta) {
                  yield { textChunk: contentDelta };
                }
              } catch (e: any) {
                console.warn(`Error parsing OpenAI stream chunk for ${config.name} (in serverApi):`, e, jsonData);
              }
            }
          }
          // Check if buffer still contains a [DONE] message, possibly without trailing newlines
           if(buffer.startsWith(C_DATA_PREFIX) && buffer.includes("[DONE]")) {
                const doneIdx = buffer.indexOf("[DONE]");
                const potentialJsonPayload = buffer.substring(C_DATA_PREFIX.length, doneIdx).trim();
                 if (potentialJsonPayload) {
                    try {
                        const chunk = JSON.parse(potentialJsonPayload);
                        const contentDelta = chunk.choices?.[0]?.delta?.content;
                        if (contentDelta) {
                            yield { textChunk: contentDelta };
                        }
                    } catch (e) { /* ignore parsing error for partial final chunk */ }
                }
                yield { isFinal: true };
                return;
           }
        }
        yield { isFinal: true }; // Signal end of stream if loop finishes normally
    } catch (e:any) {
        console.error(`OpenAI API error in serverApi for ${config.name}:`, e);
        yield { error: e.message || `Failed to get response from ${config.name}.`, isFinal: true };
    }
  }
}
