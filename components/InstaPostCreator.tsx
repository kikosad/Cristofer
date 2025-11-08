
import React, { useState } from 'react';
import { generateInstagramPostImage } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

const InstaPostCreator: React.FC = () => {
  const [text, setText] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const resultBase64 = await generateInstagramPostImage(text);
      setGeneratedImage(`data:image/png;base64,${resultBase64}`);
    } catch (err) {
      console.error('Error generating post image:', err);
      setError('No se pudo generar la imagen. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
      if (!generatedImage) return;
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = 'arizzta_frase.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="p-8 md:p-12 bg-slate-50 flex-grow">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h2 className="text-3xl font-bold font-serif text-slate-800">Creador de Posts para Instagram</h2>
          <p className="text-slate-600 mt-2">Escribe tu frase y genera una imagen con estilo de máquina de escribir sobre papel, lista para compartir.</p>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-xl space-y-6">
          <form onSubmit={handleSubmit}>
            <label htmlFor="post-text" className="block text-sm font-medium text-slate-700 mb-2">
              Texto de la frase:
            </label>
            <textarea
              id="post-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="A veces caer, a veces volar..."
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-slate-400 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="mt-4 w-full px-6 py-3 bg-slate-700 text-white font-semibold rounded-md disabled:bg-slate-300 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? 'Generando...' : 'Generar Imagen'}
            </button>
          </form>

          {error && <p className="text-center text-red-500">{error}</p>}

          <div className="w-full aspect-square bg-slate-100 rounded-lg shadow-inner flex items-center justify-center p-4">
            {isLoading ? <LoadingSpinner text="Creando tu post..." /> : (
              generatedImage ? (
                <img src={generatedImage} alt="Post generado" className="rounded-lg object-contain h-full w-full" />
              ) : (
                <p className="text-slate-400 text-center">La vista previa de tu imagen aparecerá aquí.</p>
              )
            )}
          </div>

          {generatedImage && !isLoading && (
            <button
                onClick={handleDownload}
                className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
                Descargar Imagen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstaPostCreator;