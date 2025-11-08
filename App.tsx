
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { LoadingSpinner } from './components/LoadingSpinner';
import EbookReader from './components/EbookReader';
import Chatbot from './components/Chatbot';
import ResearchAssistant from './components/ResearchAssistant';
import ImageEditor from './components/ImageEditor';
import LiveJournal from './components/LiveJournal';
import InstaPostCreator from './components/InstaPostCreator';
import { generateBookContent } from './services/geminiService';
import type { Page } from './types';
import { Feature } from './types';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>(Feature.EBOOK);
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBook = async () => {
      setIsLoading(true);
      const bookPages = await generateBookContent();
      setPages(bookPages);
      setIsLoading(false);
    };
    fetchBook();
  }, []);

  const renderFeature = () => {
    if (isLoading && (activeFeature === Feature.EBOOK || activeFeature === Feature.LIVE_JOURNAL)) {
      return (
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner text="Generando tu libro de introspección..." />
        </div>
      );
    }
    
    switch (activeFeature) {
      case Feature.EBOOK:
        return <EbookReader pages={pages} />;
      case Feature.CHAT:
        return <Chatbot />;
      case Feature.RESEARCH:
          return <ResearchAssistant />;
      case Feature.IMAGE_EDITOR:
          return <ImageEditor />;
      case Feature.LIVE_JOURNAL:
          return <LiveJournal pages={pages} />;
      case Feature.INSTA_POST_CREATOR:
          return <InstaPostCreator />;
      default:
        return <EbookReader pages={pages} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeFeature={activeFeature} setActiveFeature={setActiveFeature} />
      <main className="flex-1 flex flex-col">
        {renderFeature()}
      </main>
    </div>
  );
};

export default App;