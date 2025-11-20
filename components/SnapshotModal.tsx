import React, { useState } from 'react';
import { generateConceptArt } from '../services/geminiService';
import { X, Loader2, Download, Image as ImageIcon } from 'lucide-react';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPrompt: string;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ isOpen, onClose, defaultPrompt }) => {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('16:9');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
      if(isOpen) setPrompt(defaultPrompt);
  }, [isOpen, defaultPrompt]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const base64 = await generateConceptArt(prompt, aspectRatio);
      setGeneratedImage(base64);
    } catch (e) {
      setError("Erreur lors de la génération. Vérifiez votre clé API ou réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" /> 
            Studio Conceptuel IA
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          
          {/* Left Panel: Controls */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description du Concept</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Décrivez votre planète..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Format (Ratio)</label>
              <div className="grid grid-cols-3 gap-2">
                {['1:1', '16:9', '9:16'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r as any)}
                    className={`py-2 px-3 rounded border text-sm font-mono transition-colors ${
                      aspectRatio === r 
                        ? 'bg-indigo-600 border-indigo-400 text-white' 
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="mt-auto w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              {isLoading ? 'Génération...' : 'Générer Image'}
            </button>
            
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            <p className="text-xs text-slate-500 mt-2">Powered by Gemini Imagen 4.0</p>
          </div>

          {/* Right Panel: Preview */}
          <div className="w-full md:w-2/3 bg-black rounded-xl border border-slate-800 flex items-center justify-center relative min-h-[300px]">
            {generatedImage ? (
              <div className="relative w-full h-full flex flex-col items-center">
                <img 
                  src={generatedImage} 
                  alt="Generated Concept" 
                  className="max-w-full max-h-[50vh] object-contain rounded shadow-2xl"
                />
                 <a 
                  href={generatedImage} 
                  download="eco-planet-concept.jpg"
                  className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur text-white p-2 rounded-full"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            ) : (
              <div className="text-center text-slate-600 p-8">
                {isLoading ? (
                   <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p>L'IA imagine votre monde...</p>
                   </div>
                ) : (
                  <>
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Aucune image générée.</p>
                    <p className="text-sm opacity-60">Cliquez sur "Générer" pour visualiser votre planète.</p>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};