import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Character, ImageSlotData } from './types';
import { CharacterSlot } from './components/CharacterSlot';
import { ImageSlot } from './components/ImageSlot';
import { generateImage } from './services/geminiService';

const NUM_CHARACTER_SLOTS = 15;
const CHARACTERS_STORAGE_KEY = 'gemini-character-generator-characters';

const initialCharacters = Array.from({ length: NUM_CHARACTER_SLOTS }, (_, i) => ({
  id: i,
  uid: '',
  image: null,
}));

// Function to load characters from localStorage
const loadCharactersFromStorage = (): Character[] => {
  try {
    const savedData = window.localStorage.getItem(CHARACTERS_STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Basic validation
      if (Array.isArray(parsedData) && parsedData.length === NUM_CHARACTER_SLOTS) {
        return parsedData;
      }
    }
  } catch (error) {
    console.error("Failed to load characters from localStorage:", error);
  }
  return initialCharacters;
};

// Utility function to get image aspect ratio
const getImageAspectRatio = (dataUrl: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.width / img.height);
    };
    img.onerror = (err) => {
      console.error("Failed to load image for aspect ratio check");
      reject(err);
    };
    img.src = dataUrl;
  });
};

const TrashIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const PauseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
);

const PlayIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
);

const StopIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
    </svg>
);


const App: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>(loadCharactersFromStorage);
  const [rawPrompts, setRawPrompts] = useState<string>('');
  const [imageSlots, setImageSlots] = useState<ImageSlotData[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const generationControl = useRef({ paused: false, stopped: false });


  // Effect to save characters to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
    } catch (error) {
      console.error("Failed to save characters to localStorage:", error);
    }
  }, [characters]);

  useEffect(() => {
    const definedCharacters = characters.filter(c => c.uid.trim() !== '' && c.image);
    const promptLines = rawPrompts.split(/\n\s*\n/).filter(p => p.trim() !== '');

    const newSlots = promptLines.map((prompt, i) => {
      const oldSlot = imageSlots[i];
      
      const foundChars = definedCharacters.filter(c => prompt.includes(c.uid));
      const characterIds = foundChars.map(c => c.id);

      const areCharacterIdsSame = (a: number[], b: number[]) => {
          if (a.length !== b.length) return false;
          const sortedA = [...a].sort();
          const sortedB = [...b].sort();
          return sortedA.every((val, index) => val === sortedB[index]);
      };

      if (oldSlot && oldSlot.prompt === prompt && areCharacterIdsSame(oldSlot.characterIds, characterIds)) {
        return oldSlot;
      }
      
      return {
        id: i,
        prompt: prompt,
        imageUrl: null,
        isLoading: false,
        characterIds: characterIds,
      };
    });

    setImageSlots(newSlots);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPrompts, characters]);

  const handleCharacterUpdate = useCallback((id: number, updates: Partial<Omit<Character, 'id'>>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const handleGenerate = useCallback(async (slotId: number): Promise<void> => {
    const slot = imageSlots.find(s => s.id === slotId);
    if (!slot || !slot.prompt || slot.isLoading) return;

    setImageSlots(prev => prev.map(s => s.id === slotId ? { ...s, isLoading: true } : s));

    try {
      const characterImages = slot.characterIds
        .map(id => characters.find(c => c.id === id))
        .filter((c): c is Character => !!c)
        .map(c => c.image)
        .filter((img): img is string => !!img);
        
      let aspectRatioHint: 'landscape' | 'portrait' | 'square' = 'square';
      if (characterImages.length > 0) {
        try {
          const ratios = await Promise.all(characterImages.map(getImageAspectRatio));
          const averageRatio = ratios.reduce((acc, ratio) => acc + ratio, 0) / ratios.length;
          
          if (averageRatio > 1.1) {
            aspectRatioHint = 'landscape';
          } else if (averageRatio < 0.9) {
            aspectRatioHint = 'portrait';
          }
        } catch(e) {
          console.warn("Could not determine average image aspect ratio, defaulting to square.", e);
        }
      }

      const imageUrl = await generateImage(slot.prompt, characterImages, aspectRatioHint);
      setImageSlots(prev => prev.map(s => s.id === slotId ? { ...s, imageUrl, isLoading: false } : s));
    } catch (error) {
      alert((error as Error).message);
      setImageSlots(prev => prev.map(s => s.id === slotId ? { ...s, isLoading: false } : s));
      throw error; // Re-throw to be caught by the bulk generator
    }
  }, [imageSlots, characters]);

  const handleGenerateAll = async () => {
    const slotsToGenerate = imageSlots.filter(slot => slot.prompt && !slot.imageUrl);
    if (slotsToGenerate.length === 0) {
      alert("No prompts to generate images for.");
      return;
    }

    setIsGeneratingAll(true);
    setIsPaused(false);
    generationControl.current = { paused: false, stopped: false };
    setGenerationStatus('Preparing to generate...');

    let generatedInBatchCounter = 0;
    let totalGeneratedCounter = 0;
    const totalToGenerate = slotsToGenerate.length;

    for (const slot of slotsToGenerate) {
      if (generationControl.current.stopped) break;

      while (generationControl.current.paused) {
        if (generationControl.current.stopped) break;
        setGenerationStatus(`Generation paused. Click Resume to continue.`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (generationControl.current.stopped) break;

      if (generatedInBatchCounter > 0 && generatedInBatchCounter % 10 === 0) {
        for (let i = 20; i >= 1; i--) {
          if (generationControl.current.stopped) break;
          setGenerationStatus(`Pausing for ${i} second${i > 1 ? 's' : ''}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if (generationControl.current.stopped) break;
        generatedInBatchCounter = 0;
      }
      
      totalGeneratedCounter++;
      setGenerationStatus(`Generating image ${totalGeneratedCounter} of ${totalToGenerate}...`);
      
      try {
        await handleGenerate(slot.id);
        generatedInBatchCounter++;
      } catch (error) {
        setGenerationStatus(`Failed on image ${totalGeneratedCounter} of ${totalToGenerate}. Continuing...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (generationControl.current.stopped) {
        setGenerationStatus('Generation stopped by user.');
    } else {
        setGenerationStatus('Generation complete!');
    }
    
    setTimeout(() => {
      setGenerationStatus('');
      setIsGeneratingAll(false);
      setIsPaused(false);
    }, 5000);
  };

  const handlePauseResumeToggle = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    generationControl.current.paused = newPausedState;
  };

  const handleStop = () => {
    if (window.confirm('Are you sure you want to stop the generation process?')) {
        generationControl.current.stopped = true;
        if (generationControl.current.paused) {
            setIsPaused(false);
            generationControl.current.paused = false;
        }
    }
  };

  const saveImage = (imageUrl: string, filename: string) => {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleSave = (slotId: number) => {
    const slot = imageSlots.find(s => s.id === slotId);
    if (slot?.imageUrl) {
      saveImage(slot.imageUrl, `generated_image_${slotId + 1}.png`);
    }
  };
  
  const handleSaveAll = () => {
    imageSlots.forEach(slot => {
      if (slot.imageUrl) {
        handleSave(slot.id);
      }
    });
  };

  const handleResetAllData = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all characters, prompts, and generated images? This action cannot be undone.')) {
      setCharacters(initialCharacters);
      setRawPrompts('');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4">
      <header className="flex-shrink-0">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
          Gemini Character Image Generator
        </h1>
        <p className="text-center text-gray-400 mt-1">
          Define your characters, write your scenes, and bring them to life.
        </p>
      </header>
      
      <main className="flex-grow flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Control Panel */}
        <div className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0 flex flex-col gap-4 bg-gray-800/50 p-4 rounded-xl shadow-lg overflow-y-auto">
          <div>
            <h2 className="text-xl font-semibold mb-3 border-b border-gray-600 pb-2">Characters ({characters.filter(c=>c.uid && c.image).length}/{NUM_CHARACTER_SLOTS})</h2>
            <div className="space-y-3 max-h-64 lg:max-h-[calc(50vh-100px)] overflow-y-auto pr-2">
              {characters.map(char => (
                <CharacterSlot key={char.id} character={char} onUpdate={handleCharacterUpdate} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-3 border-b border-gray-600 pb-2">Prompts</h2>
            <textarea
              value={rawPrompts}
              onChange={(e) => setRawPrompts(e.target.value)}
              placeholder="Enter one prompt per scene. Separate scenes with a blank line..."
              className="w-full h-48 lg:h-[calc(50vh-100px)] bg-gray-900 border border-gray-600 rounded-md p-3 text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
            />
          </div>
          <div className="mt-auto pt-4 border-t border-gray-700">
            <button
              onClick={handleResetAllData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-500 transition-colors shadow-md"
            >
              <TrashIcon className="w-5 h-5" />
              Reset All Data
            </button>
          </div>
        </div>

        {/* Image Grid */}
        <div className="w-full lg:w-2/3 xl:w-3/4 flex flex-col gap-4 overflow-hidden">
            <div className="flex-shrink-0 bg-gray-800/50 p-3 rounded-xl flex flex-col items-center justify-center gap-2">
                <div className="flex items-center justify-center gap-4">
                    {!isGeneratingAll ? (
                        <button
                            onClick={handleGenerateAll}
                            disabled={isGeneratingAll}
                            className="px-6 py-2 font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-md hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-wait"
                        >
                            Generate All
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePauseResumeToggle}
                                className="flex items-center justify-center gap-2 w-32 px-4 py-2 font-semibold text-white bg-yellow-600 rounded-md hover:bg-yellow-500 transition-colors shadow-md"
                            >
                                {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                                {isPaused ? 'Resume' : 'Pause'}
                            </button>
                             <button
                                onClick={handleStop}
                                className="flex items-center justify-center gap-2 w-32 px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-500 transition-colors shadow-md"
                            >
                                <StopIcon className="w-5 h-5" />
                                Stop
                            </button>
                        </div>
                    )}
                    <button
                        onClick={handleSaveAll}
                        disabled={isGeneratingAll}
                        className="px-6 py-2 font-semibold text-white bg-gradient-to-r from-green-600 to-teal-600 rounded-md hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
                    >
                        Save All
                    </button>
                </div>
                {generationStatus && (
                    <p className="text-sm text-indigo-300 mt-2 min-h-[20px]">{generationStatus}</p>
                )}
            </div>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-2">
            {imageSlots.length > 0 ? (
                imageSlots.map(slot => (
                <ImageSlot 
                    key={slot.id} 
                    slot={slot} 
                    characters={slot.characterIds
                        .map(id => characters.find(c => c.id === id))
                        .filter((c): c is Character => !!c)
                    }
                    onGenerate={handleGenerate}
                    onSave={handleSave}
                    isBulkGenerating={isGeneratingAll}
                />
                ))
            ) : (
                <div className="col-span-full flex items-center justify-center text-center text-gray-500 bg-gray-900/50 rounded-lg p-8">
                    <div className="flex flex-col items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-300">Ready to create?</h3>
                        <p className="mt-1">Enter your prompts in the text area on the left.</p>
                        <p>Each scene separated by a blank line will create a new image slot here.</p>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;