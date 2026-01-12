import React, { useState, useRef } from 'react';
import { Image } from 'antd';

const ImagePreviewOverlay = ({ src, alt, children, overlayWidth = 400, overlayHeight = 400 }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.top;
    let left = rect.right + 10;

    if (left + overlayWidth > viewportWidth) {
      left = rect.left - overlayWidth - 10;
    }

    if (top + overlayHeight > viewportHeight) {
      top = viewportHeight - overlayHeight - 20;
    }

    if (top < 20) {
      top = 20;
    }

    setPosition({ top, left });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block', position: 'relative' }}
    >
      {children}
      {isHovered && (
        <div
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${overlayWidth}px`,
            height: `${overlayHeight}px`,
            zIndex: 9999,
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            padding: '8px',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <Image
            src={src}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '4px'
            }}
            preview={false}
          />
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ImagePreviewOverlay;
