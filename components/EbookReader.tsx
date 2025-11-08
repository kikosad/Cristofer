import React, { useState, useCallback, useEffect } from 'react';
import { Page } from '../types';
import { summarizeText } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

interface EbookReaderProps {
  pages: Page[];
}

const EbookReader: React.FC<EbookReaderProps> = ({ pages }) => {
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('lastReadPage');
    if (savedPage) {
      const pageNumber = parseInt(savedPage, 10);
      if (!isNaN(pageNumber) && pageNumber >= 0) {
        return pageNumber;
      }
    }
    return 0;
  });
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [hoveredPage, setHoveredPage] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);

  useEffect(() => {
    localStorage.setItem('lastReadPage', currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    if (pages.length > 0 && currentPage >= pages.length) {
      setCurrentPage(pages.length - 1);
    }
  }, [pages, currentPage]);

  const handleSummarize = useCallback(async () => {
    if (isSummarizing || !pages[currentPage]) return;
    setIsSummarizing(true);
    setSummary('');
    try {
      const result = await summarizeText(pages[currentPage].content);
      setSummary(result);
    } catch (error) {
      console.error('Error summarizing text:', error);
      setSummary('No se pudo generar el resumen.');
    } finally {
      setIsSummarizing(false);
    }
  }, [currentPage, pages, isSummarizing]);

  const pageData = pages[currentPage];
  const currentChapter = pageData?.chapter;

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, pages.length - 1));
    setSummary('');
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
    setSummary('');
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pages.length <= 1) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const totalPages = pages.length - 1;
    const percentage = clickX / width;
    const targetPage = Math.round(percentage * totalPages);
    
    setCurrentPage(Math.max(0, Math.min(targetPage, totalPages)));
    setSummary('');
  };

  const handleProgressBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pages.length <= 1) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const width = rect.width;
    const totalPages = pages.length - 1;
    const percentage = hoverX / width;
    const targetPage = Math.round(percentage * totalPages);
    
    setHoveredPage(Math.max(0, Math.min(targetPage, totalPages)) + 1);
    setHoverPosition(hoverX);
  };

  const handleProgressBarLeave = () => {
    setHoveredPage(null);
  };

  return (
    <div className="p-8 md:p-12 bg-slate-50 flex-grow flex flex-col items-center justify-center">
      <div className="bg-white p-8 md:p-16 rounded-lg shadow-lg max-w-2xl w-full flex flex-col h-[80vh]">
        <header className="mb-4 text-center">
          <h2 className="text-3xl font-bold font-serif text-slate-800">{currentChapter}</h2>
        </header>

        <main className="flex-grow flex items-center justify-center my-6">
          <p className="text-lg md:text-xl leading-relaxed text-slate-700 text-center font-serif">
            {pageData?.content || 'Cargando contenido...'}
          </p>
        </main>
        
        <div className="text-center my-4">
          <button 
            onClick={handleSummarize} 
            disabled={isSummarizing}
            className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50">
            {isSummarizing ? 'Resumiendo...' : 'Resumir con IA'}
          </button>
          {isSummarizing && <div className="mt-2"><LoadingSpinner /></div>}
          {summary && <p className="text-sm text-slate-600 mt-3 p-3 bg-slate-50 rounded-md"><em>{summary}</em></p>}
        </div>

        <footer className="flex flex-col items-center mt-auto pt-4 border-t border-slate-100">
            <div className="relative w-full mb-4">
                {hoveredPage !== null && (
                    <div 
                        className="absolute bottom-full mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded-md whitespace-nowrap pointer-events-none"
                        style={{ left: `${hoverPosition}px`, transform: 'translateX(-50%)' }}
                    >
                        Página {hoveredPage}
                    </div>
                )}
                <div 
                    className="w-full h-2 bg-slate-200 rounded-full cursor-pointer"
                    onClick={handleProgressBarClick}
                    onMouseMove={handleProgressBarHover}
                    onMouseLeave={handleProgressBarLeave}
                >
                    <div 
                        className="h-full bg-slate-700 rounded-full transition-all duration-150 ease-out"
                        style={{ width: pages.length > 1 ? `${(currentPage / (pages.length - 1)) * 100}%` : '0%'}}
                    ></div>
                </div>
            </div>

            <div className="flex justify-between items-center w-full">
                <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 0}
                    className="px-6 py-2 bg-slate-700 text-white rounded-md disabled:bg-slate-300 transition-colors"
                >
                    Anterior
                </button>
                <span className="text-sm text-slate-500 font-medium">
                    Página {currentPage + 1} de {pages.length}
                </span>
                <button
                    onClick={goToNextPage}
                    disabled={currentPage === pages.length - 1 || pages.length === 0}
                    className="px-6 py-2 bg-slate-700 text-white rounded-md disabled:bg-slate-300 transition-colors"
                >
                    Siguiente
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default EbookReader;