// File: client/src/App.tsx
import React from 'react';
import { SimplifiedUpload } from './components/SimplifiedUpload';
import { ThemeProvider } from './lib/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-gray-50">
        <SimplifiedUpload />
      </div>
    </ThemeProvider>
  );
}

export default App;
