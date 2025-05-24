import React, { useState } from 'react';

interface ApiKeyMissingBannerProps {
  missingKeys: string[]; // Array of human-readable names of missing keys like "Gemini API Key", "OpenAI API Key"
  onKeySubmit: (keyName: string, keyValue: string) => void;
}

const ApiKeyMissingBanner: React.FC<ApiKeyMissingBannerProps> = ({ missingKeys, onKeySubmit }) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const handleInputChange = (keyName: string, value: string) => {
    setInputValues(prev => ({ ...prev, [keyName]: value }));
  };

  const handleSubmit = (keyName: string) => {
    if (inputValues[keyName]) {
      const apiKeyName = keyName.replace(/\s+/g, '_').toUpperCase();
      onKeySubmit(apiKeyName, inputValues[keyName]);
    }
  };

  if (missingKeys.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 text-white p-4 mb-4 border border-gray-700 rounded-md">
      <h2 className="font-bold mb-2">Missing API Keys:</h2>
      {missingKeys.map(keyName => (
        <div key={keyName} className="mb-2">
          <label className="block mb-1">{keyName}:</label>
          <div className="flex items-center space-x-2">
            <input
              type="password"
              value={inputValues[keyName] || ''}
              onChange={(e) => handleInputChange(keyName, e.target.value)}
              className="p-2 bg-gray-700 border border-gray-600 rounded w-64 md:w-80 text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => handleSubmit(keyName)}
              className="p-2 bg-blue-600 rounded hover:bg-blue-700 text-white"
            >
              Submit
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ApiKeyMissingBanner;
