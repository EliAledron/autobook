import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BackButton({ 
  onClick, 
  style = {}, 
  variant = 'light', // Changed default to light so it's always white
  showText = false,
  text = 'Back'
}) {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);

  const handlePress = (e) => {
    if (onClick) {
      onClick(e);
    } else {
      navigate(-1);
    }
  };

  const isLight = variant === 'light';
  
  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: isLight ? '#ffffff' : '#2a5298',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: showText ? '10px 16px' : '8px',
    marginLeft: showText ? '0' : '-8px', // Offset the padding so the icon aligns with the left edge
    marginRight: showText ? '0' : '-4px', // Reduce the effective space on the right side
    minWidth: '40px',
    minHeight: '40px',
    borderRadius: '24px',
    opacity: isActive ? 0.6 : 1, // Touch feedback instead of hover
    transform: isActive ? 'scale(0.96)' : 'scale(1)',
    transition: 'opacity 0.1s ease, transform 0.1s ease',
    WebkitTapHighlightColor: 'transparent', // Removes default Android/iOS tap highlight
    ...style
  };

  return (
    <button 
      style={baseStyle} 
      onClick={handlePress}
      onTouchStart={() => setIsActive(true)}
      onTouchEnd={() => setIsActive(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onMouseLeave={() => setIsActive(false)}
      aria-label="Go back"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {showText && <span>{text}</span>}
    </button>
  );
}
