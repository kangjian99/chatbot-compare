export enum MessageRole {
  USER = 'user',
  MODEL = 'model', // For Gemini, this is 'model'. For OpenAI, this maps to 'assistant'.
}

export enum ModelType {
  GEMINI = 'gemini',
  OPENAI_COMPATIBLE = 'openai_compatible',
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  isLoading?: boolean;
  error?: string;
  groundingSources?: GroundingSource[];
}

export interface ModelConfig {
  id: string; // Unique ID for the column/chat instance
  name: string; // User-facing name for the model configuration
  modelType: ModelType;
  modelNameApi: string; // The model name/ID to be used in API calls (e.g., "gemini-2.5-flash-preview-04-17", "gpt-3.5-turbo")
  apiKeyName: 'GEMINI_API_KEY' | 'OPENAI_COMPATIBLE_API_KEY'; // Identifier for the API key in environment
  
  // Gemini-specific
  geminiSystemInstruction?: string; // System instruction specifically for Gemini
  useGoogleSearch?: boolean;

  // OpenAI-compatible specific
  openaiBaseUrl?: string; // Base URL for the OpenAI-compatible API
  openaiSystemInstruction?: string; // System instruction for OpenAI (typically sent as first message)
}

// Handle for ChatColumn component to expose sendMessage
export interface ChatColumnHandle {
  sendMessageFromParent: (userInput: string) => Promise<void>;
}
