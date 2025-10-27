import React from 'react';
import type { ImageSlotData, Character } from '../types';

const GenerateIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const SaveIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);


interface ImageSlotProps {
  slot: ImageSlotData;
  characters: Character[];
  onGenerate: (id: number) => Promise<void>;
  onSave: (id: number) => void;
  isBulkGenerating: boolean;
}

export const ImageSlot: React.FC<ImageSlotProps> = ({ slot, characters, onGenerate, onSave, isBulkGenerating }) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg flex flex-col">
      <div className="aspect-w-16 aspect-h-9 w-full bg-gray-900/50">
        <div className="w-full h-full flex items-center justify-center">
          {slot.isLoading ? (
            <div className="animate-pulse flex flex-col items-center justify-center text-gray-400">
               <GenerateIcon className="w-12 h-12 mb-2"/>
              <span>Generating...</span>
            </div>
          ) : slot.imageUrl ? (
            <img src={slot.imageUrl} alt={`Generated for prompt: ${slot.prompt}`} className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-600 text-center p-4">
                <p>Awaiting prompt to generate image...</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-3 bg-gray-800/80 flex-grow flex flex-col justify-between">
        <div className="flex items-start gap-2 mb-2 min-h-[40px]">
          {characters.length > 0 && (
            <div className="flex -space-x-4 flex-shrink-0">
              {characters.map(character => (
                character.image && (
                  <img
                    key={character.id}
                    src={character.image}
                    alt={character.uid}
                    title={character.uid}
                    className="w-10 h-10 rounded-full border-2 border-indigo-500 object-cover"
                  />
                )
              ))}
            </div>
          )}
          <p className={`text-sm text-gray-300 ${characters.length === 0 ? 'w-full' : ''}`}>{slot.prompt || '...'}</p>
        </div>
        <div className="flex items-center space-x-2 mt-auto">
          <button
            onClick={() => onGenerate(slot.id)}
            disabled={slot.isLoading || !slot.prompt || isBulkGenerating}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <GenerateIcon className="w-4 h-4 mr-2"/>
            Generate
          </button>
          <button
            onClick={() => onSave(slot.id)}
            disabled={!slot.imageUrl}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <SaveIcon className="w-4 h-4 mr-2"/>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};