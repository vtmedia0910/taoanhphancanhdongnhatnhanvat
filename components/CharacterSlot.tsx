import React from 'react';
import type { Character } from '../types';

interface CharacterSlotProps {
  character: Character;
  onUpdate: (id: number, updates: Partial<Omit<Character, 'id'>>) => void;
}

const PlusIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);


export const CharacterSlot: React.FC<CharacterSlotProps> = ({ character, onUpdate }) => {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(character.id, { image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(character.id, { uid: e.target.value });
  };
  
  const imageInputId = `image-upload-${character.id}`;

  return (
    <div className="flex items-center space-x-3 p-2 bg-gray-700/50 rounded-lg">
      <label htmlFor={imageInputId} className="cursor-pointer">
        <div className="w-16 h-16 rounded-md bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition-colors overflow-hidden">
          {character.image ? (
            <img src={character.image} alt={`Character ${character.id}`} className="w-full h-full object-contain" />
          ) : (
            <PlusIcon className="w-8 h-8"/>
          )}
        </div>
        <input id={imageInputId} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </label>
      <div className="flex-1">
        <label htmlFor={`uid-input-${character.id}`} className="text-xs text-gray-400">UID #{character.id + 1}</label>
        <input
          id={`uid-input-${character.id}`}
          type="text"
          placeholder="e.g., char1"
          value={character.uid}
          onChange={handleUidChange}
          className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
      </div>
    </div>
  );
};
