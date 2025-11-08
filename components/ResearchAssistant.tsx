
import React, { useState } from 'react';
import type { GroundingChunk } from '../types';
import { getGroundedResponse } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';
import { SearchIcon } from './icons/SearchIcon';

const ResearchAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<{ text: string; chunks: GroundingChunk[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await getGroundedResponse(query);
      setResponse(result);
    } catch (err) {
      console.error('Error getting grounded response:', err);
      setError('No se pudo obtener una respuesta. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 md:p-12 bg-slate-50 flex-grow">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h2 className="text-3xl font-bold font-serif text-slate-800">Asistente de Búsqueda</h2>
          <p className="text-slate-600 mt-2">Explora temas relacionados con el libro con información actualizada de la web.</p>
        </header>
        
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-md mb-8">
          <SearchIcon className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: ¿Cuáles son los últimos estudios sobre la meditación?"
            className="flex-1 p-2 bg-transparent focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-5 py-2 bg-slate-700 text-white rounded-md disabled:bg-slate-300 transition-colors font-medium"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {isLoading && <div className="flex justify-center"><LoadingSpinner text="Consultando la web..." /></div>}
        {error && <p className="text-center text-red-500">{error}</p>}
        
        {response && (
          <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
            <div className="prose max-w-none text-slate-800">
              <p>{response.text}</p>
            </div>
            
            {response.chunks.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">Fuentes:</h3>
                <ul className="space-y-1">
                  {response.chunks.map((chunk, index) => chunk.web && (
                    <li key={index}>
                      <a 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {chunk.web.title || chunk.web.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchAssistant;
