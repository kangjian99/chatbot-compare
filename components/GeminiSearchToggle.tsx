import React from 'react';

interface GeminiSearchToggleProps {
  isSearchEnabled: boolean;
  onToggleSearch: (enabled: boolean) => void;
  disabled?: boolean;
}

const GeminiSearchToggle: React.FC<GeminiSearchToggleProps> = ({ isSearchEnabled, onToggleSearch, disabled }) => {
  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    onToggleSearch(event.target.checked);
  };

  return (
    <div className="flex items-center justify-center space-x-2 p-2 bg-gray-800 rounded-md shadow">
      <label htmlFor="gemini-search-toggle" className="text-sm font-medium text-gray-300">
        Enable Google Search for Gemini:
      </label>
      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
        <input
          type="checkbox"
          name="gemini-search-toggle"
          id="gemini-search-toggle"
          checked={isSearchEnabled}
          onChange={handleToggle}
          disabled={disabled}
          className="opacity-0 absolute top-0 left-0 w-full h-full cursor-pointer z-10"        />
        <div
          className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer
            ${isSearchEnabled ? 'bg-green-500' : 'bg-gray-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white shadow-md transform duration-300 ease-in-out
              ${isSearchEnabled ? 'translate-x-full' : ''}`}
          />
        </div>
      </div>
       <span className={`text-xs ${isSearchEnabled ? 'text-green-400' : 'text-gray-400'}`}>
        {isSearchEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  );
};

export default GeminiSearchToggle;
