import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const initializeSpeechRecognition = () => {
    if (!recognitionRef.current) {
      if ('webkitSpeechRecognition' in window) {
        recognitionRef.current = new window.webkitSpeechRecognition();
      } else if ('SpeechRecognition' in window) {
        recognitionRef.current = new window.SpeechRecognition();
      } else {
        setError('Speech recognition is not supported in your browser');
        return false;
      }
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        console.log('Speech recognized:', transcript);
        setText(transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}. Try reloading the page.`);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition service disconnected');
        if (isRecording) {
          console.log('Attempting to restart...');
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Failed to restart recording:', e);
          }
        }
      };
    }
    
    return true;
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
    };
  }, []);

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const toggleRecording = () => {
    setError('');
    
    if (isRecording) {
      console.log('Stopping recording...');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
      setIsRecording(false);
    } else {
      console.log('Starting recording...');
      if (initializeSpeechRecognition()) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (e) {
          console.error('Error starting recognition:', e);
          setError(`Could not start recording: ${e.message}`);
        }
      }
    }
  };

  return (
    <div className="app-container">
      <div className="voice-recorder-card">
        <div className="card-header">
          <h1>Voice to Text</h1>
          <p className="subtitle">Speak and see your words transform into text</p>
        </div>
        
        <div className="card-content">
          {error && <div className="error-message">{error}</div>}
          
          <div className="recording-section">
            <button 
              onClick={toggleRecording} 
              className={`record-button ${isRecording ? 'recording' : ''}`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <span className="button-content">
                <span className="mic-icon"></span>
                <span className="button-text">{isRecording ? 'Stop' : 'Record'}</span>
              </span>
            </button>
            
            {isRecording && 
              <div className="recording-status">
                <div className="pulse-dot"></div>
                <span>Recording...</span>
              </div>
            }
          </div>
          
          <div className="text-area-container">
            <label htmlFor="speech-text" className="text-label">Transcribed Text</label>
            <textarea
              id="speech-text"
              value={text}
              onChange={handleTextChange}
              placeholder={isRecording ? "Speak now..." : "Click 'Record' to start speaking..."}
              className="speech-textarea"
              readOnly={isRecording}
            />
          </div>
          
          {text && (
            <div className="actions">
              <button 
                className="action-button clear-button"
                onClick={() => setText('')}
                aria-label="Clear text"
              >
                Clear
              </button>
              <button 
                className="action-button copy-button"
                onClick={() => {
                  navigator.clipboard.writeText(text);
                  alert('Text copied to clipboard!');
                }}
                aria-label="Copy text"
              >
                Copy
              </button>
            </div>
          )}
        </div>
        
        <footer className="card-footer">
          <p>Made with React and Web Speech API</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
