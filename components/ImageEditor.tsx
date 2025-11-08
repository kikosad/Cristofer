
import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setEditedImage(null);
        setError(null);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const resultBase64 = await editImage(base64String, file.type, prompt);
        setEditedImage(`data:image/png;base64,${resultBase64}`);
      }
    } catch (err) {
      console.error('Error editing image:', err);
      setError('No se pudo editar la imagen. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 md:p-12 bg-slate-50 flex-grow">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h2 className="text-3xl font-bold font-serif text-slate-800">Editor de Emociones Visuales</h2>
          <p className="text-slate-600 mt-2">Transforma una imagen con tus palabras. Sube una foto y descríbele a la IA cómo quieres que se sienta.</p>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-xl">
          {!originalImage && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-12">
              <p className="mb-4 text-slate-500">Sube una imagen para empezar</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                Seleccionar Archivo
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
          )}

          {originalImage && (
            <div>
              <form onSubmit={handleSubmit} className="mb-6 flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: 'Añade un filtro retro', 'Haz que parezca un sueño'..."
                  className="flex-1 p-3 border rounded-md focus:ring-2 focus:ring-slate-400 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-md disabled:bg-slate-300 transition-colors"
                >
                  {isLoading ? 'Generando...' : 'Transformar'}
                </button>
              </form>

              {error && <p className="text-center text-red-500 mb-4">{error}</p>}

              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="text-center">
                  <h3 className="font-semibold text-slate-700 mb-2">Original</h3>
                  <img src={originalImage} alt="Original" className="rounded-lg shadow-md mx-auto max-h-96" />
                   <button
                    onClick={() => {
                      setOriginalImage(null);
                      setFile(null);
                    }}
                    className="mt-4 px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                  >
                    Cambiar imagen
                  </button>
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-slate-700 mb-2">Editada</h3>
                  <div className="w-full aspect-square bg-slate-100 rounded-lg shadow-md flex items-center justify-center mx-auto max-h-96">
                    {isLoading ? <LoadingSpinner text="Creando magia..." /> : (
                      editedImage ? <img src={editedImage} alt="Edited" className="rounded-lg object-contain h-full w-full" /> : <p className="text-slate-400">Tu imagen transformada aparecerá aquí</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
