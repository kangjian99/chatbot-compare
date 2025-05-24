import React, { useMemo, useState, useEffect, createRef, useCallback } from 'react';
import { MODEL_CONFIGS as initialModelConfigs, API_KEYS } from './constants';
// No longer importing useChat here directly for App's main logic
import Header from './components/Header';
import ChatColumn from './components/ChatColumn';
import UserInput from './components/UserInput';
import ApiKeyMissingBanner from './components/ApiKeyMissingBanner';
import GeminiSearchToggle from './components/GeminiSearchToggle';
import { ModelConfig, ModelType, ChatColumnHandle } from './types';

const App: React.FC = () => {
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>(initialModelConfigs);
  const [apiKeys, setApiKeys] = useState(API_KEYS); // 使用状态管理 API Keys
  
  // 修改：使用 useMemo 来初始化 loadingStates，而不是使用 useEffect
  const initialLoadingStates = useMemo(() => {
    const states: Record<string, boolean> = {};
    modelConfigs.forEach(config => {
      states[config.id] = false;
    });
    return states;
  }, [modelConfigs]);

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(initialLoadingStates);

  // Create refs for each ChatColumn instance
  const chatColumnRefs = useMemo(() => 
    modelConfigs.map(() => createRef<ChatColumnHandle>()),
    [modelConfigs.length] // Recreate refs array if number of models changes
  );

  // Find the Gemini config to manage its search state
  const geminiConfigIndex = modelConfigs.findIndex(conf => conf.modelType === ModelType.GEMINI);
  const geminiConfig = geminiConfigIndex !== -1 ? modelConfigs[geminiConfigIndex] : null;

  const handleKeySubmit = (keyName: string, keyValue: string) => {
    setApiKeys(prev => ({ ...prev, [keyName]: keyValue }));
  };

  const missingApiKeysInfo = useMemo(() => {
    const missing: string[] = [];
    modelConfigs.forEach(config => {
      if (!apiKeys[config.apiKeyName]) {
        const keyDisplayName = config.apiKeyName.replace(/_/g, ' ').replace(/\bAPI KEY\b/i, 'API Key');
        if (!missing.includes(keyDisplayName)) {
            missing.push(keyDisplayName);
        }
      }
    });
    return missing;
  }, [modelConfigs, apiKeys]); // 依赖 apiKeys

  const isAnyApiKeyMissing = missingApiKeysInfo.length > 0;
  const isGeminiApiKeyMissing = geminiConfig ? !apiKeys[geminiConfig.apiKeyName] : true;


  const handleToggleGeminiSearch = (enabled: boolean) => {
    setModelConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.modelType === ModelType.GEMINI
          ? { ...config, useGoogleSearch: enabled, name: `Gemini Flash${enabled ? ' (Search)' : ''}` }
          : config
      )
    );
  };
  
  const handleLoadingChange = useCallback((configId: string, isLoading: boolean) => {
    setLoadingStates(prev => {
      // 只有当状态真正改变时才更新
      if (prev[configId] === isLoading) {
        return prev;
      }
      return { ...prev, [configId]: isLoading };
    });
  }, []); // 空依赖数组，因为这个函数不依赖于任何外部变量

  const handleSendMessage = (userInput: string) => {
    chatColumnRefs.forEach(ref => {
      if (ref.current) {
        ref.current.sendMessageFromParent(userInput);
      }
    });
  };

  const isAnyInstanceLoading = Object.values(loadingStates).some(state => state);
  const allConfiguredModelsMissingKeys = modelConfigs.every(config => !apiKeys[config.apiKeyName]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-900 text-white">
      <Header title="Gemini & AI Chat Compare" />
      {isAnyApiKeyMissing && (
        <ApiKeyMissingBanner
          missingKeys={missingApiKeysInfo}
          onKeySubmit={handleKeySubmit}
        />
      )}
      
      {geminiConfig && (
         <div className="py-2 px-4 flex justify-center">
            <GeminiSearchToggle
                isSearchEnabled={geminiConfig.useGoogleSearch || false}
                onToggleSearch={handleToggleGeminiSearch}
                disabled={isGeminiApiKeyMissing}
            />
        </div>
      )}
      
      <main className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
        {modelConfigs.map((config, index) => {
          const currentApiKey = apiKeys[config.apiKeyName];
          return (
            <ChatColumn
              key={config.id}
              ref={chatColumnRefs[index]} // Assign ref
              config={config}
              apiKey={currentApiKey} // 将获取到的 key 传递给 ChatColumn
              onLoadingChange={handleLoadingChange} // Pass callback
              // messages, isLoading, error are now handled internally by ChatColumn via useChat
            />
          );
        })}
      </main>
      
      <UserInput 
        onSendMessage={handleSendMessage} 
        isLoading={isAnyInstanceLoading}
        disabled={allConfiguredModelsMissingKeys}
      />
    </div>
  );
};

export default App;
