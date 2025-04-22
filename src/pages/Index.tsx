import { useEffect, useRef, useState } from "react";
import ImportDialog from "../components/ImportDialog";

const Index = () => {
  // DOM element references
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightedContentRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const testCaseListRef = useRef<HTMLDivElement>(null);
  
  // State
  const [savedTests, setSavedTests] = useState<Array<{id: string, title: string, content: string}>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, ch: 0 });

  // New state for sidebar selection and import dialog
  const [selectedScenario, setSelectedScenario] = useState<{id: string, title: string, content: string} | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  
  // Load saved tests from local storage
  useEffect(() => {
    const storedTests = localStorage.getItem('gherkinTests');
    if (storedTests) {
      setSavedTests(JSON.parse(storedTests));
    }
  }, []);
  
  // Apply syntax highlighting
  const applySyntaxHighlighting = (text: string) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    const highlightedLines = lines.map(line => {
      // Check for keywords at the beginning of the line
      const keywordMatch = line.match(/^(Feature:|Scenario:|Given|When|Then|And|But)(\s+)(.*)/i);
      if (keywordMatch) {
        const keyword = keywordMatch[1];
        const space = keywordMatch[2];
        const rest = keywordMatch[3];
        
        // Capitalize first letter of keyword
        const capitalizedKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
        
        // Highlight parameters in quotes in the rest of the line
        const highlightedRest = rest.replace(/"([^"]*)"/g, '<span class="parameter">"$1"</span>');
        
        return `<div><span class="keyword">${capitalizedKeyword}</span>${space}${highlightedRest}</div>`;
      }
      
      return `<div>${line || '&nbsp;'}</div>`;
    });
    
    return highlightedLines.join('');
  };
  
  // Extract all steps from saved tests for autocomplete
  const getAllSteps = () => {
    const steps: string[] = [];
    savedTests.forEach(test => {
      const lines = test.content.split('\n');
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.match(/^(Given|When|Then|And|But)\s+.+/i)) {
          // Extract the step without the keyword
          const step = trimmedLine.replace(/^(Given|When|Then|And|But)\s+/i, '');
          if (!steps.includes(step)) {
            steps.push(step);
          }
        }
      });
    });
    return steps;
  };
  
  // Show toast notification
  const showToast = (title: string, message: string, isError: boolean = false) => {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastTitle && toastMessage) {
      toastTitle.textContent = title;
      toastMessage.textContent = message;
      
      if (isError) {
        toast.classList.add('error');
      } else {
        toast.classList.remove('error');
      }
      
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  };
  
  // Handle editor input
  const handleEditorInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const editor = e.target;
    const text = editor.value;
    
    if (highlightedContentRef.current) {
      highlightedContentRef.current.innerHTML = applySyntaxHighlighting(text);
      
      // Sync scroll position - THIS IS THE KEY FIX
      highlightedContentRef.current.scrollTop = editor.scrollTop;
    }
    
    // Get current line for autocomplete
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    
    // Check if we're in a step line
    const stepMatch = currentLine.match(/^(Given|When|Then|And|But)\s+(.*)$/i);
    if (stepMatch && suggestionsRef.current) {
      const keyword = stepMatch[1];
      const currentInput = stepMatch[2].toLowerCase();
      
      // Filter suggestions based on current input
      const allSteps = getAllSteps();
      const filteredSuggestions = allSteps
        .filter(step => step.toLowerCase().includes(currentInput))
        .map(step => `${keyword} ${step}`);
      
      if (filteredSuggestions.length > 0) {
        suggestionsRef.current.innerHTML = '';
        filteredSuggestions.forEach(suggestion => {
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.textContent = suggestion;
          item.addEventListener('click', () => selectSuggestion(suggestion));
          suggestionsRef.current?.appendChild(item);
        });
        suggestionsRef.current.style.display = 'block';
        
        // Position suggestions BELOW the current line
        const lineHeight = 24; // Approximate line height
        const lineIndex = lines.length - 1;
        suggestionsRef.current.style.top = `${16 + (lineIndex + 1) * lineHeight}px`; // +1 to position below
        
        setCursorPosition({
          line: lines.length - 1,
          ch: currentLine.length
        });
      } else {
        suggestionsRef.current.style.display = 'none';
      }
    } else if (suggestionsRef.current) {
      suggestionsRef.current.style.display = 'none';
    }
  };
  
  // Select suggestion
  const selectSuggestion = (suggestion: string) => {
    if (!editorRef.current || !highlightedContentRef.current) return;
    
    const lines = editorRef.current.value.split('\n');
    const currentLineIndex = cursorPosition.line;
    
    // Replace the current line with the selected suggestion
    lines[currentLineIndex] = suggestion;
    
    editorRef.current.value = lines.join('\n');
    highlightedContentRef.current.innerHTML = applySyntaxHighlighting(editorRef.current.value);
    if (suggestionsRef.current) suggestionsRef.current.style.display = 'none';
    
    // Focus back on the editor
    editorRef.current.focus();
  };
  
  // Save test case
  const saveTestCase = () => {
    if (!editorRef.current || !highlightedContentRef.current) return;
    
    const content = editorRef.current.value.trim();
    
    if (!content) {
      showToast('Hata', 'Boş test senaryosu kaydedilemez.', true);
      return;
    }
    
    // Extract scenario title
    const scenarioMatch = content.match(/Scenario:\s*(.+)$/m);
    const title = scenarioMatch ? scenarioMatch[1].trim() : 'İsimsiz Senaryo';
    
    if (editingId) {
      // Update existing test
      const updatedTests = savedTests.map(test => 
        test.id === editingId ? { ...test, title, content } : test
      );
      setSavedTests(updatedTests);
      localStorage.setItem('gherkinTests', JSON.stringify(updatedTests));
      setEditingId(null);
    } else {
      // Save new test
      const newTest = {
        id: Date.now().toString(),
        title,
        content
      };
      const updatedTests = [...savedTests, newTest];
      setSavedTests(updatedTests);
      localStorage.setItem('gherkinTests', JSON.stringify(updatedTests));
    }
    
    editorRef.current.value = '';
    highlightedContentRef.current.innerHTML = '';
    showToast('Başarılı', 'Test senaryosu kaydedildi.');
  };
  
  // Edit test case
  const editTestCase = (id: string) => {
    const testToEdit = savedTests.find(test => test.id === id);
    if (testToEdit && editorRef.current && highlightedContentRef.current) {
      editorRef.current.value = testToEdit.content;
      highlightedContentRef.current.innerHTML = applySyntaxHighlighting(testToEdit.content);
      setEditingId(id);
      
      // Scroll to editor
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Focus on editor
      editorRef.current.focus();
    }
  };
  
  // Delete test case
  const deleteTestCase = (id: string) => {
    if (window.confirm('Bu test senaryosunu silmek istediğinize emin misiniz?')) {
      const filteredTests = savedTests.filter(test => test.id !== id);
      setSavedTests(filteredTests);
      localStorage.setItem('gherkinTests', JSON.stringify(filteredTests));
      showToast('Başarılı', 'Test senaryosu silindi.');

      if (editingId === id && editorRef.current && highlightedContentRef.current) {
        editorRef.current.value = '';
        highlightedContentRef.current.innerHTML = '';
        setEditingId(null);
      }
      if (selectedScenario && selectedScenario.id === id) {
        setSelectedScenario(null);
      }
    }
  };
  
  // Export test cases
  const exportTestCases = () => {
    if (savedTests.length === 0) {
      showToast('Hata', 'Dışa aktarılacak test senaryosu yok.', true);
      return;
    }
    
    const exportContent = savedTests.map(test => test.content).join('\n\n');
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gherkin_test_cases.feature';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Başarılı', 'Test senaryoları dışa aktarıldı.');
  };
  
  // Handle editor scroll - Key function to fix the scroll issue
  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightedContentRef.current) {
      highlightedContentRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Select scenario to show on sidebar
  const handleShowScenario = (test: { id: string, title: string, content: string }) => {
    setSelectedScenario(test);
  };

  // Handle imported scenarios (from ImportDialog)
  const addImportedScenarios = (scenarios: Array<{title: string, content: string}>) => {
    const now = Date.now();
    const withIds = scenarios.map((item, idx) => ({
      id: (now + idx).toString(),
      ...item
    }));
    const updatedTests = [...savedTests, ...withIds];
    setSavedTests(updatedTests);
    localStorage.setItem('gherkinTests', JSON.stringify(updatedTests));
    showToast('Başarılı', 'Senaryolar başarıyla içe aktarıldı.');
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) && 
          event.target !== editorRef.current) {
        suggestionsRef.current.style.display = 'none';
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row w-full min-h-[90vh]">
      {/* Main content: Editor and saved list */}
      <div className="flex-1 container">
        <h1>Cucumber Gherkin Test Case Editor</h1>
        <div className="button-container">
          <button onClick={saveTestCase} className="primary-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>{editingId ? 'Güncelle' : 'Kaydet'}</span>
          </button>
          <button onClick={exportTestCases} className="secondary-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Dışa Aktar
          </button>
          <button onClick={() => setImportOpen(true)} className="secondary-button flex items-center">
            {/* Lucide "import" icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21V3"/><path d="M7 16l5 5 5-5"/></svg>
            İçe Aktar
          </button>
        </div>

        <div className="editor-container">
          <div className="editor">
            <textarea 
              ref={editorRef}
              id="editor" 
              placeholder="Gherkin test senaryonuzu yazmaya başlayın..." 
              onInput={handleEditorInput}
              onScroll={handleEditorScroll}
            ></textarea>
            <div ref={highlightedContentRef} className="highlighted-content"></div>
          </div>
          <div ref={suggestionsRef} className="suggestions" style={{ display: 'none' }}></div>
        </div>

        {/* Kaydedilmiş Test Senaryoları listesi */}
        <h2>Kaydedilmiş Test Senaryoları</h2>
        <div ref={testCaseListRef} className="test-case-list">
          {savedTests.length === 0 ? (
            <div className="empty-state">Henüz kaydedilmiş test senaryosu yok.</div>
          ) : (
            savedTests.map((test) => (
              <div key={test.id} className="test-case-card">
                <div className="test-case-header" onClick={() => handleShowScenario(test)}>
                  <div className="test-case-title">{test.title}</div>
                  <div className="button-group">
                    <button className="edit-button" onClick={(e) => {
                      e.stopPropagation();
                      editTestCase(test.id);
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button className="edit-button" onClick={(e) => {
                      e.stopPropagation();
                      deleteTestCase(test.id);
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Hide the content preview in the list, as it's now in the sidebar */}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sidebar for displaying selected scenario */}
      <div className="w-full md:w-[400px] border-l border-gray-200 bg-gray-50 p-6 min-h-full">
        <h2 className="font-semibold text-lg mb-4">Senaryo Önizleme</h2>
        {selectedScenario ? (
          <pre className="whitespace-pre-wrap bg-white rounded p-4 border text-sm overflow-auto min-h-[200px] max-h-[75vh]">{selectedScenario.content}</pre>
        ) : (
          <div className="text-gray-400 italic text-sm">Bir senaryo seçin...</div>
        )}
      </div>

      {/* Import dialog */}
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={addImportedScenarios} />
      
      {/* Toast and Footer */}
      <div id="toast" className="toast">
        <div className="toast-title" id="toastTitle"></div>
        <div className="toast-message" id="toastMessage"></div>
      </div>
      <footer>
        Created by yasin yilmaz @2025
      </footer>
      <style jsx>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        body {
          padding: 20px;
          background-color: #f9fafb;
          color: #111827;
        }
        
        .container {
          max-width: 1000px;
          margin: 0 auto;
        }
        
        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }
        
        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          margin-top: 2rem;
        }
        
        .button-container {
          display: flex;
          gap: 8px;
          margin-bottom: 1rem;
        }
        
        button {
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          transition: background-color 0.2s;
        }
        
        .primary-button {
          background-color: #6366f1;
          color: white;
        }
        
        .primary-button:hover {
          background-color: #4f46e5;
        }
        
        .secondary-button {
          background-color: white;
          color: #4b5563;
          border: 1px solid #d1d5db;
        }
        
        .secondary-button:hover {
          background-color: #f9fafb;
        }
        
        .editor-container {
          position: relative;
          margin-bottom: 2rem;
        }
        
        .editor {
          width: 100%;
          height: 300px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 16px;
          background-color: white;
          position: relative;
          overflow: hidden; /* Important to hide overflowing content */
        }
        
        .editor textarea {
          width: 100%;
          height: 100%;
          font-family: monospace;
          font-size: 14px;
          resize: none;
          border: none;
          background-color: transparent;
          position: absolute;
          top: 0;
          left: 0;
          padding: 16px;
          color: transparent;
          caret-color: black;
          z-index: 2;
          line-height: 1.5;
          overflow-y: auto; /* Enable scrolling */
        }
        
        .editor textarea:focus {
          outline: none;
        }
        
        .highlighted-content {
          width: 100%;
          height: 100%;
          font-family: monospace;
          font-size: 14px;
          white-space: pre-wrap;
          overflow-y: auto;
          pointer-events: none;
          line-height: 1.5;
          position: absolute;
          top: 0;
          left: 0;
          padding: 16px;
        }
        
        .keyword {
          font-weight: 600;
        }
        
        .parameter {
          color: #ef4444;
        }
        
        .suggestions {
          position: absolute;
          z-index: 10;
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          max-height: 200px;
          overflow-y: auto;
          width: 100%;
        }
        
        .suggestion-item {
          padding: 8px 16px;
          cursor: pointer;
        }
        
        .suggestion-item:hover {
          background-color: #f3f4f6;
        }
        
        .test-case-list {
          display: grid;
          gap: 16px;
        }
        
        .test-case-card {
          background-color: white;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          padding: 16px;
        }
        
        .test-case-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          cursor: pointer;
        }
        
        .test-case-title {
          font-weight: 600;
        }
        
        .button-group {
          display: flex;
          gap: 4px;
        }
        
        .edit-button {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
        }
        
        .edit-button:hover {
          color: #111827;
        }
        
        .test-case-content {
          background-color: #f9fafb;
          padding: 12px;
          border-radius: 4px;
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 14px;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out, padding 0.3s ease-out;
        }
        
        .test-case-content.expanded {
          max-height: 500px;
          padding: 12px;
        }
        
        .toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: white;
          border-radius: 6px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 50;
          min-width: 300px;
          border-left: 4px solid #6366f1;
          animation: slideIn 0.3s ease-out;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s, visibility 0.3s;
        }
        
        .toast.show {
          opacity: 1;
          visibility: visible;
        }
        
        .toast.error {
          border-left-color: #ef4444;
        }
        
        .toast-title {
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .toast-message {
          font-size: 0.875rem;
          color: #4b5563;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        .empty-state {
          color: #6b7280;
          text-align: center;
          padding: 20px;
        }
        
        footer {
          margin-top: 40px;
          padding: 20px 0;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default Index;
