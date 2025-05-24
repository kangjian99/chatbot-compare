import { ModelConfig, ModelType } from './types';

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-05-20';
export const DEFAULT_OPENAI_COMPATIBLE_MODEL_TEXT = 'tngtech/deepseek-r1t-chimera:freegpt-3.5-turbo'; // Example, user might use a different one
export const DEFAULT_OPENAI_API_BASE_URL = 'https://openrouter.ai/api/v1';


// Attempt to access API_KEY from process.env for Gemini
let geminiApiKey: string | undefined;
try {
    // @ts-ignore
    geminiApiKey = process.env.GEMINI_API_KEY;
} catch (e) {
    // @ts-ignore
    if (window.process && window.process.env) {
        // @ts-ignore
        geminiApiKey = window.process.env.GEMINI_API_KEY;
    }
}
if (!geminiApiKey) {
    console.warn("Gemini API_KEY (process.env.GEMINI.API_KEY) is not defined.");
}

// Attempt to access API_KEY for OpenAI-compatible model
let openaiCompatibleApiKey: string | undefined;
try {
    // @ts-ignore
    openaiCompatibleApiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
} catch (e) {
    // @ts-ignore
    if (window.process && window.process.env) {
        // @ts-ignore
        openaiCompatibleApiKey = window.process.env.OPENAI_COMPATIBLE_API_KEY;
    }
}
if (!openaiCompatibleApiKey) {
    console.warn("OpenAI Compatible API Key (process.env.OPENAI_COMPATIBLE_API_KEY) is not defined.");
}

// Try to get OpenAI base URL from env, fallback to default
let openaiBaseUrl: string = DEFAULT_OPENAI_API_BASE_URL;
try {
    // @ts-ignore
    const envBaseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
    // @ts-ignore
    const windowEnvBaseUrl = window.process?.env?.OPENAI_COMPATIBLE_BASE_URL;
    if (envBaseUrl) {
        openaiBaseUrl = envBaseUrl;
    } else if (windowEnvBaseUrl) {
        openaiBaseUrl = windowEnvBaseUrl;
    }
} catch(e) {
    // Silently use default if not found
}


export const API_KEYS = {
  GEMINI_API_KEY: geminiApiKey,
  OPENAI_COMPATIBLE_API_KEY: openaiCompatibleApiKey,
};

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: 'model-gemini',
    name: 'Gemini Flash', // Updated name
    modelType: ModelType.GEMINI,
    modelNameApi: GEMINI_MODEL_TEXT,
    apiKeyName: 'GEMINI_API_KEY',
    geminiSystemInstruction: 'You are a helpful assistant.', // Default instruction
    useGoogleSearch: false, // Default to false for Google Search
  },
  {
    id: 'model-openai-compatible',
    name: 'OpenAI Compatible', // User can configure actual model via env or it defaults
    modelType: ModelType.OPENAI_COMPATIBLE,
    // @ts-ignore
    modelNameApi: (typeof process !== 'undefined' && process.env?.OPENAI_COMPATIBLE_MODEL_ID) || (window.process?.env?.OPENAI_COMPATIBLE_MODEL_ID) || DEFAULT_OPENAI_COMPATIBLE_MODEL_TEXT,
    apiKeyName: 'OPENAI_COMPATIBLE_API_KEY',
    openaiBaseUrl: openaiBaseUrl,
    openaiSystemInstruction: 'You are a versatile and creative AI assistant.',
  },
];