import React, { createContext, useContext, useState, useEffect } from 'react';

const CursorContext = createContext({
  cursorType: 'DEFAULT',
  cursorText: '',
  setCursor: () => {},
  resetCursor: () => {}
});

export const CursorProvider = ({ children }) => {
  const [cursorType, setCursorType] = useState('DEFAULT'); // 'DEFAULT', 'PLAY', 'VIEW', 'DRAG', 'OPEN'
  const [cursorText, setCursorText] = useState('');
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch device
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const setCursor = (type, text = '') => {
    if (isTouchDevice) return;
    setCursorType(type);
    setCursorText(text);
  };

  const resetCursor = () => {
    if (isTouchDevice) return;
    setCursorType('DEFAULT');
    setCursorText('');
  };

  return (
    <CursorContext.Provider value={{ cursorType, cursorText, setCursor, resetCursor, isTouchDevice }}>
      {children}
    </CursorContext.Provider>
  );
};

export const useCursor = () => useContext(CursorContext);
