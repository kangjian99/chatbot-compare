
import React from 'react';
import { GroundingSource } from '../types';

interface GroundingSourceDisplayProps {
  sources?: GroundingSource[];
}

const GroundingSourceDisplay: React.FC<GroundingSourceDisplayProps> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 p-2 border-t border-gray-600">
      <h4 className="text-xs font-semibold text-gray-400 mb-1">Sources:</h4>
      <ul className="list-disc list-inside space-y-1">
        {sources.map((source, index) => (
          <li key={index} className="text-xs">
            <a
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline truncate"
              title={source.uri}
            >
              {source.title || source.uri}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GroundingSourceDisplay;
