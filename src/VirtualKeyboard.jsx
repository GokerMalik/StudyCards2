import React, { useState } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import './VirtualKeyboard.css';

const dutchLayout = {
  default: [
    'é ë ï ö ü ç',
    '{space}'
  ]
};

export default function VirtualKeyboard({ onInput }) {
  const handleButtonClick = button => {
    if (onInput) onInput(button === '{space}' ? ' ' : button);
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <Keyboard
        layout={dutchLayout}
        display={{ '{space}': 'Space' }}
        onKeyPress={handleButtonClick}
      />
    </div>
  );
}
