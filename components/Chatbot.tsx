
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { getChatbotResponse } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hola, soy tu guía de reflexión. ¿Sobre qué concepto del libro te gustaría profundizar?' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const responseText = await getChatbotResponse(history, input);
      const modelMessage: ChatMessage = { role: 'model', text: responseText };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      const fallback = error instanceof Error ? error.message : 'Lo siento, no pude procesar tu solicitud en este momento.';
      const errorMessage: ChatMessage = { role: 'model', text: fallback };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 md:p-12 bg-slate-50 flex-grow flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col h-[90vh] bg-white rounded-lg shadow-xl">
            <header className="p-4 border-b">
                <h2 className="text-xl font-bold font-serif text-slate-800 text-center">Chat de Reflexión</h2>
            </header>
            <main className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="p-3 rounded-lg bg-slate-100">
                            <LoadingSpinner />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta aquí..."
                        className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-slate-400 focus:outline-none"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2 bg-slate-700 text-white rounded-md disabled:bg-slate-300 transition-colors"
                    >
                        Enviar
                    </button>
                </form>
            </footer>
        </div>
    </div>
  );
};

export default Chatbot;
