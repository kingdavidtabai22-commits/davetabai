import React from 'react';
import { UserPlus } from 'lucide-react';
import { VisualizationMode } from '../types/genealogy';

interface HeaderProps {
  activeSection: 'intake' | VisualizationMode;
  hasTree: boolean;
  onNavigate: (section: 'intake' | VisualizationMode) => void;
  onOpenAddRelative: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  hasTree,
  onNavigate,
  onOpenAddRelative,
}) => {
  const navItems: { id: 'intake' | VisualizationMode; label: string; disabled?: boolean }[] = [
    { id: 'intake', label: 'Your Profile' },
    { id: 'pedigree', label: 'Pedigree Tree', disabled: !hasTree },
    { id: 'fan', label: 'Radial Fan', disabled: !hasTree },
    { id: 'timeline', label: 'Timeline & Map', disabled: !hasTree },
    { id: 'kinship', label: 'Kinship Lab', disabled: !hasTree },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-[#E4DDD0]">
      <div className="max-w-[1440px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('intake')}
          className="font-serif text-xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A]"
        >
          Lineage Atlas
        </button>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => onNavigate(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isActive
                    ? 'text-[#1E3A8A] border-[#1E3A8A]'
                    : 'text-[#57534E] border-transparent hover:text-[#1C1917] hover:border-[#D6CEBE]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          {hasTree ? (
            <button
              type="button"
              onClick={onOpenAddRelative}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#FBF9F5] bg-[#1E3A8A] rounded-md hover:bg-[#172D6B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Relative</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('pedigree')}
              className="px-4 py-2 text-xs font-semibold text-[#1C1917] bg-[#EFE9DD] border border-[#D6CEBE] rounded-md hover:bg-[#E4DDD0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explore Archive
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav className="md:hidden flex items-center justify-around px-3 py-2 border-t border-[#E4DDD0] bg-[#F6F2EA] text-xs font-medium overflow-x-auto">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => onNavigate(item.id)}
              className={`whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded transition-colors ${
                isActive ? 'text-[#1E3A8A] bg-white border border-[#E4DDD0]' : 'text-[#57534E]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
