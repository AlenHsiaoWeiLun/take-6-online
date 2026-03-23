import React from 'react';

export const BullHeadIcon = ({ className = "w-6 h-6", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 30C20 30 10 40 10 60C10 80 30 90 50 90C70 90 90 80 90 60C90 40 80 30 80 30" stroke={color} strokeWidth="6" strokeLinecap="round"/>
    <path d="M30 40C30 40 35 20 50 20C65 20 70 40 70 40" stroke={color} strokeWidth="6" strokeLinecap="round"/>
    <circle cx="35" cy="55" r="5" fill={color}/>
    <circle cx="65" cy="55" r="5" fill={color}/>
    <path d="M40 75C40 75 45 80 50 80C55 80 60 75 60 75" stroke={color} strokeWidth="4" strokeLinecap="round"/>
    <path d="M20 30L15 15" stroke={color} strokeWidth="6" strokeLinecap="round"/>
    <path d="M80 30L85 15" stroke={color} strokeWidth="6" strokeLinecap="round"/>
  </svg>
);

export const EmoteIcon = ({ type, className = "w-8 h-8" }: { type: string, className?: string }) => {
  switch (type) {
    case 'shock':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5"/>
          <circle cx="35" cy="40" r="8" fill="currentColor"/>
          <circle cx="65" cy="40" r="8" fill="currentColor"/>
          <circle cx="50" cy="70" r="12" stroke="currentColor" strokeWidth="5"/>
        </svg>
      );
    case 'laugh':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5"/>
          <path d="M30 40Q35 35 40 40" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <path d="M60 40Q65 35 70 40" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <path d="M30 65Q50 85 70 65" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        </svg>
      );
    case 'angry':
      return (
        <svg viewBox="0 0 100 100" className={className} fill="none">
          <circle cx="50" cy="50" r="45" stroke="#ef4444" strokeWidth="5" fill="#fee2e2"/>
          <path d="M30 35L45 45" stroke="#ef4444" strokeWidth="5" strokeLinecap="round"/>
          <path d="M70 35L55 45" stroke="#ef4444" strokeWidth="5" strokeLinecap="round"/>
          <path d="M35 70Q50 60 65 70" stroke="#ef4444" strokeWidth="5" strokeLinecap="round"/>
        </svg>
      );
    case 'cool':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="none">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5"/>
            <rect x="25" y="35" width="20" height="10" rx="2" fill="currentColor"/>
            <rect x="55" y="35" width="20" height="10" rx="2" fill="currentColor"/>
            <path d="M45 40H55" stroke="currentColor" strokeWidth="3"/>
            <path d="M35 70Q50 75 65 70" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          </svg>
        );
    default:
      return null;
  }
};

export const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const LogOutIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export const LogInIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export const MaximizeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 00 2-2v-3M3 16v3a2 2 0 00 2 2h3" />
  </svg>
);

export const MinimizeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 01 2-2h3M3 16h3a2 2 0 01 2 2v3" />
  </svg>
);

export const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export const CameraIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
