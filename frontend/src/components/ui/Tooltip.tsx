import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  iconOnly?: boolean;
}

export default function Tooltip({ content, children, iconOnly = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + (rect.width / 2),
      });
    }
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={isVisible ? hideTooltip : showTooltip}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
      >
        {iconOnly ? <Info size={14} style={{ opacity: 0.5 }} /> : children}
        {!iconOnly && <span style={{ marginLeft: 4, opacity: 0.5 }}><Info size={14} /></span>}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: Math.min(position.left, window.innerWidth - 250),
            transform: 'translateX(-50%)',
            background: '#1a1a2e',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            maxWidth: 240,
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            lineHeight: 1.4,
          }}
        >
          {content}
          <div style={{
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '6px solid #1a1a2e',
          }} />
        </div>
      )}
    </>
  );
}
