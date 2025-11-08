import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getGenAI } from '../services/geminiService';
import type { LiveServerMessage, LiveSession } from '@google/genai';
import { Modality } from '@google/genai';
import { MicIcon } from './icons/MicIcon';
import type { Page } from '../types';

// Helper functions for audio encoding/decoding, defined at module level
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

interface TranscriptEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  linkedPage?: number;
}

interface LiveJournalProps {
    pages: Page[];
}

const LiveJournal: React.FC<LiveJournalProps> = ({ pages }) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [linkingEntryId, setLinkingEntryId] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

     // Load transcript from localStorage on mount
    useEffect(() => {
        try {
            const savedTranscript = localStorage.getItem('journalTranscript');
            if (savedTranscript) {
                const parsed = JSON.parse(savedTranscript);
                if (Array.isArray(parsed)) {
                    setTranscript(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to load or parse journal transcript from localStorage", e);
            localStorage.removeItem('journalTranscript');
        }
    }, []);

    // Save transcript to localStorage on change
    useEffect(() => {
        if (transcript.length > 0) {
            localStorage.setItem('journalTranscript', JSON.stringify(transcript));
        }
    }, [transcript]);


    const stopSession = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
         if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }

        setIsActive(false);
        setIsConnecting(false);
        for (const source of sourcesRef.current.values()) {
            source.stop();
        }
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;

    }, []);

    const startSession = async () => {
        setIsConnecting(true);
        setError(null);
        setLinkingEntryId(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const ai = getGenAI();
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('Session opened.');
                        setIsConnecting(false);
                        setIsActive(true);

                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        sourceRef.current = source;
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            
                            if(sessionPromiseRef.current){
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        handleMessage(message);
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError('Ocurrió un error en la conexión. Por favor, intenta de nuevo.');
                        stopSession();
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Session closed.');
                        stopSession();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    systemInstruction: "Eres un diario empático y un guía de reflexión. Tu rol es escuchar atentamente al usuario. Intercala tus respuestas entre breves palabras de aliento y, con mucha frecuencia, haz preguntas reflexivas cortas (ej: '¿Y cómo te hizo sentir eso?', '¿Qué crees que significa para ti?') u ofrece observaciones suaves para guiar una introspección más profunda. Mantén siempre tus intervenciones concisas, cálidas y sin juicios. No des consejos, solo acompaña y facilita la reflexión.",
                },
            });

        } catch (err) {
            console.error('Failed to start session:', err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('No se pudo iniciar la sesión en vivo. Verifica los permisos del micrófono y tu configuración de IA.');
            }
            setIsConnecting(false);
        }
    };
    
    const handleMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription?.text) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
        }
        if (message.serverContent?.inputTranscription?.text) {
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
        }

        if (message.serverContent?.turnComplete) {
            const userInput = currentInputTranscription.current.trim();
            const modelOutput = currentOutputTranscription.current.trim();
            const newEntries: TranscriptEntry[] = [];
            
            if (userInput) {
                 newEntries.push({ id: `user-${Date.now()}`, role: 'user', text: userInput });
            }
            if (modelOutput) {
                 newEntries.push({ id: `model-${Date.now()}`, role: 'model', text: modelOutput });
            }
           
            if (newEntries.length > 0) {
                setTranscript(prev => [...prev, ...newEntries]);
            }
           
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
        }
        
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            const ctx = outputAudioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
        }
    };

    const handleLinkPage = (entryId: string, pageNumber: number) => {
        if (isNaN(pageNumber)) {
            setLinkingEntryId(null);
            return;
        }
        setTranscript(prev => prev.map(t => t.id === entryId ? { ...t, linkedPage: pageNumber } : t));
        setLinkingEntryId(null);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);


    return (
        <div className="p-8 md:p-12 bg-slate-50 flex-grow flex flex-col items-center">
            <div className="w-full max-w-3xl flex flex-col h-[90vh] bg-white rounded-lg shadow-xl">
                <header className="p-4 border-b text-center">
                    <h2 className="text-xl font-bold font-serif text-slate-800">Diario Verbal</h2>
                    <p className="text-sm text-slate-500">Habla libremente. La IA te escuchará y reflexionará contigo.</p>
                </header>
                <main className="flex-1 p-6 overflow-y-auto space-y-2">
                    {transcript.map((t) => (
                        <div key={t.id}>
                            <div className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-md p-3 rounded-lg ${t.role === 'user' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                    <p className="text-sm leading-relaxed">{t.text}</p>
                                </div>
                            </div>
                             {t.role === 'user' && !isActive && (
                                <div className="text-right mt-1 pr-1">
                                    {linkingEntryId === t.id ? (
                                        <div className="inline-flex items-center gap-2 bg-white p-1 rounded-md border">
                                            <select
                                                className="text-xs p-1 border-slate-300 rounded"
                                                defaultValue=""
                                                onChange={(e) => handleLinkPage(t.id, parseInt(e.target.value, 10))}
                                            >
                                                <option value="" disabled>Seleccionar página...</option>
                                                {pages.map(p => (
                                                    <option key={p.page} value={p.page}>Pág {p.page}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => setLinkingEntryId(null)} className="text-xs text-red-500 hover:text-red-700 font-bold pr-1">✕</button>
                                        </div>
                                    ) : t.linkedPage ? (
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                            Vinculado a Pág. {t.linkedPage}
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => setLinkingEntryId(t.id)}
                                            className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
                                        >
                                            Vincular a Página
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                     {!isActive && transcript.length === 0 && <p className="text-center text-slate-400">Presiona "Empezar Diario" para comenzar a hablar.</p>}
                </main>
                <footer className="p-4 border-t text-center flex flex-col items-center justify-center">
                    {error && <p className="text-red-500 mb-2">{error}</p>}
                    {!isActive ? (
                        <button
                            onClick={startSession}
                            disabled={isConnecting}
                            className="w-20 h-20 bg-slate-700 text-white rounded-full flex items-center justify-center disabled:bg-slate-300 transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                        >
                            {isConnecting ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div> : <MicIcon className="w-8 h-8" />}
                        </button>
                    ) : (
                        <button
                            onClick={stopSession}
                            className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center transition-all hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 animate-pulse"
                        >
                            <div className="w-6 h-6 bg-white rounded-sm"></div>
                        </button>
                    )}
                    <p className="text-xs text-slate-500 mt-3">{isConnecting ? 'Conectando...' : isActive ? 'Grabando... presiona para detener' : 'Presiona para empezar'}</p>
                </footer>
            </div>
        </div>
    );
};

export default LiveJournal;