
import React from 'react';
import { Feature } from '../types';
import { BookIcon } from './icons/BookIcon';
import { ChatIcon } from './icons/ChatIcon';
import { ImageIcon } from './icons/ImageIcon';
import { MicIcon } from './icons/MicIcon';
import { SearchIcon } from './icons/SearchIcon';
import { CreateIcon } from './icons/CreateIcon';

interface SidebarProps {
  activeFeature: Feature;
  setActiveFeature: (feature: Feature) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'bg-slate-200 text-slate-900'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      {icon}
      <span className="ml-4">{label}</span>
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeFeature, setActiveFeature }) => {
  const navItems = [
    {
      feature: Feature.EBOOK,
      label: 'Leer Libro',
      icon: <BookIcon className="w-5 h-5" />,
    },
    {
      feature: Feature.CHAT,
      label: 'Chat de Reflexión',
      icon: <ChatIcon className="w-5 h-5" />,
    },
    {
      feature: Feature.RESEARCH,
      label: 'Asistente de Búsqueda',
      icon: <SearchIcon className="w-5 h-5" />,
    },
    {
      feature: Feature.IMAGE_EDITOR,
      label: 'Editor de Emociones',
      icon: <ImageIcon className="w-5 h-5" />,
    },
    {
        feature: Feature.LIVE_JOURNAL,
        label: 'Diario Verbal',
        icon: <MicIcon className="w-5 h-5" />,
    },
    {
        feature: Feature.INSTA_POST_CREATOR,
        label: 'Creador de Posts',
        icon: <CreateIcon className="w-5 h-5" />,
    }
  ];

  return (
    <div className="flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen">
      <div className="flex items-center justify-center h-20 border-b border-slate-200">
        <h1 className="text-xl font-bold font-serif text-slate-800">El Espejo Interior</h1>
      </div>
      <nav className="flex-grow mt-5">
        {navItems.map((item) => (
          <NavItem
            key={item.feature}
            icon={item.icon}
            label={item.label}
            isActive={activeFeature === item.feature}
            onClick={() => setActiveFeature(item.feature)}
          />
        ))}
      </nav>
    </div>
  );
};