import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const lastTranscriptRef = useRef(''); // Track the last processed transcript

  // Check browser support and set up appropriate recognition method
  const initializeSpeechRecognition = () => {
    // Native Web Speech API support (modern browsers)
    if (!recognitionRef.current) {
      if ('webkitSpeechRecognition' in window) {
        recognitionRef.current = new window.webkitSpeechRecognition();
        setUpNativeSpeechRecognition();
        return true;
      } else if ('SpeechRecognition' in window) {
        recognitionRef.current = new window.SpeechRecognition();
        setUpNativeSpeechRecognition();
        return true;
      } else {
        // Fallback for older browsers
        console.log('Speech Recognition API not supported, using fallback method');
        setUsingFallback(true);
        
        // Check if at least MediaRecorder is supported for our fallback
        if (navigator.mediaDevices && window.MediaRecorder) {
          return true;
        } else {
          setError('Your browser does not support any speech recognition capabilities. Please try a modern browser like Chrome or Edge.');
          return false;
        }
      }
    }
    return true;
  };

  // Configure native speech recognition
  const setUpNativeSpeechRecognition = () => {
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false; // Changed to false to get only final results
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      
      // Only process if this is a final result
      if (result.isFinal) {
        const transcript = result[0].transcript;
        
        // Check if this is a duplicate of the last processed transcript
        if (transcript !== lastTranscriptRef.current) {
          console.log('New speech recognized:', transcript);
          lastTranscriptRef.current = transcript;
          
          // Append to existing text instead of replacing it
          setText(currentText => {
            // If there's already text, add a space before appending
            if (currentText && !currentText.endsWith(' ')) {
              return `${currentText} ${transcript}`;
            }
            return currentText + transcript;
          });
        } else {
          console.log('Duplicate transcript detected, ignoring:', transcript);
        }
      }
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
  };

  // Initialize recording using MediaRecorder API as fallback
  const startFallbackRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        // eslint-disable-next-line no-unused-vars
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Here, normally you would:
        // 1. Upload this blob to a server
        // 2. Send it to a speech-to-text API
        // 3. Get back the transcript
        
        // For this example, we'll just show a placeholder message, but append it properly
        setText(prev => {
          const appendText = "\n[Recording saved. In a production app, this would be sent to a speech-to-text service.]";
          // If there's already text, make sure we format it nicely
          if (prev) {
            return `${prev}${prev.endsWith('\n') ? '' : '\n'}${appendText}`;
          }
          return appendText;
        });
        
        // In a real implementation, you'd have code like:
        // const formData = new FormData();
        // formData.append('audio', audioBlob);
        // const response = await fetch('https://your-api-endpoint/speech-to-text', {
        //   method: 'POST',
        //   body: formData
        // });
        // const { transcript } = await response.json();
        // setText(prev => prev + (prev ? ' ' : '') + transcript);
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(`Could not access microphone: ${err.message}`);
    }
  };

  // Stop fallback recording
  const stopFallbackRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks on the recorded stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsRecording(false);
  };

  useEffect(() => {
    // Clean up function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        stopFallbackRecording();
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
      if (usingFallback) {
        stopFallbackRecording();
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
      setIsRecording(false);
    } else {
      console.log('Starting recording...');
      lastTranscriptRef.current = ''; // Reset the last transcript when starting a new recording
      if (initializeSpeechRecognition()) {
        if (usingFallback) {
          startFallbackRecording();
        } else {
          try {
            // Don't clear existing text, just start the recognition
            recognitionRef.current.start();
            setIsRecording(true);
          } catch (e) {
            console.error('Error starting recognition:', e);
            setError(`Could not start recording: ${e.message}`);
          }
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
          {usingFallback && (
            <div className="compatibility-notice">
              Using compatibility mode for older browsers
            </div>
          )}
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
                <span>Recording{usingFallback ? ' (compatibility mode)' : ''}...</span>
              </div>
            }
          </div>
          
          <div className="text-area-container">
            <label htmlFor="speech-text" className="text-label">Transcribed Text</label>
            <textarea
              id="speech-text"
              value={text}
              onChange={handleTextChange}
              placeholder={usingFallback 
                ? "Record audio to send to a speech-to-text service..." 
                : isRecording 
                  ? "Speak now..." 
                  : "Click 'Record' to start speaking..."}
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
          {usingFallback && (
            <p className="fallback-notice">
              Your browser doesn't support the Web Speech API. 
              For full functionality, try Chrome, Edge, or Safari.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

export default App;
