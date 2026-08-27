"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Minus, Send, Bot, Check, CheckCheck, ChevronDown } from 'lucide-react';
import BookingFlow from './BookingFlow';
import './Chatbot.css';

export default function Chatbot({ initialOpen = false, hideFab = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen); // Default state based on prop
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true); // Track scroll position
  const [autoScroll, setAutoScroll] = useState(true); // Auto-scroll toggle state
  const [isBookingFlow, setIsBookingFlow] = useState(false); // Track if in booking flow
  const [chips, setChips] = useState([
    { label: "What is WhatsApp API?", action: "message", value: "What is WhatsApp API?" },
    { label: "Pricing", action: "message", value: "Pricing" },
    { label: "FAQs", action: "message", value: "FAQs" }
  ]);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null); // Ref for messages container
  const chipsContainerRef = useRef(null);
  const chipsScrollRef = useRef(null);
  const touchStartRef = useRef(null);
  const scrollLeftRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
  };

  const toggleAutoScroll = () => {
    setAutoScroll(!autoScroll);
    // Auto-scroll to bottom when toggled on
    if (!autoScroll) {
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  // Check if user is at bottom of chat
  const handleChatScroll = () => {
    if (!chatMessagesRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold
    setIsAtBottom(isBottom);
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, isTyping, autoScroll]);

  const toggleChat = () => setIsOpen(!isOpen);

  // When the chat window is opened and there are no messages yet,
  // insert the initial bot/system message and default chips.
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const now = new Date();
      const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      const initialBotMsg = {
        id: Date.now(),
        role: 'bot',
        content: `Hello! Welcome to Wacto.<br/><br/>How Can I help you. 😊`,
        timestamp: timeString
      };

      setMessages([initialBotMsg]);
      setChips([
        { label: "Book a Demo", action: "message", value: "Book a Demo" },
        { label: "Pricing", action: "message", value: "Pricing" },
        { label: "About", action: "message", value: "About" }
      ]);
    }
  }, [isOpen]);

  // Handle chip click/action - always send message directly
  const handleChipClick = (chip) => {
    // Send the message directly without placing in input box
    sendMessage(chip.value);
  };

  // Send message (extracted for reuse)
  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const now = new Date();
    const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: timeString
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse response JSON:', e);
        data = { reply: 'Failed to parse server response' };
      }

      if (!response.ok) {
        console.error('API returned error status:', response.status);
        console.error('Error response:', data);
        
        const errorMsg = data.reply || `Server error: ${response.status}`;
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'bot',
          content: errorMsg,
          timestamp: timeString
        }]);
        return;
      }
      
      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        content: data.reply || 'Sorry, I am having trouble connecting right now.',
        timestamp: timeString
      };
      
      setMessages(prev => [...prev, botMsg]);
      
      // Check if this should trigger booking flow
      if (data.bookingFlow) {
        setIsBookingFlow(true);
      }
      
      // Update chips based on the response
      if (data.chips && Array.isArray(data.chips) && data.chips.length > 0) {
        setChips(data.chips);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        content: 'I apologize, but I am unable to process your request at the moment.',
        timestamp: timeString
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle horizontal scroll on chips
  const handleChipsMouseDown = (e) => {
    if (!chipsScrollRef.current) return;
    touchStartRef.current = e.clientX;
    scrollLeftRef.current = chipsScrollRef.current.scrollLeft;
    chipsScrollRef.current.style.scrollBehavior = 'auto';
  };

  const handleChipsMouseMove = (e) => {
    if (!touchStartRef.current || !chipsScrollRef.current) return;
    const walk = (e.clientX - touchStartRef.current) * 1; // scroll-fast
    chipsScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleChipsMouseUp = () => {
    touchStartRef.current = null;
    if (chipsScrollRef.current) {
      chipsScrollRef.current.style.scrollBehavior = 'smooth';
    }
  };

  // Handle touch for mobile
  const handleChipsTouchStart = (e) => {
    if (!chipsScrollRef.current) return;
    touchStartRef.current = e.touches[0].clientX;
    scrollLeftRef.current = chipsScrollRef.current.scrollLeft;
    chipsScrollRef.current.style.scrollBehavior = 'auto';
  };

  const handleChipsTouchMove = (e) => {
    if (!touchStartRef.current || !chipsScrollRef.current) return;
    const walk = (e.touches[0].clientX - touchStartRef.current) * 1;
    chipsScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleChipsTouchEnd = () => {
    touchStartRef.current = null;
    if (chipsScrollRef.current) {
      chipsScrollRef.current.style.scrollBehavior = 'smooth';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    await sendMessage(inputMessage);
  };

  const handleBookingComplete = (bookingData) => {
    // Add a confirmation message to the chat
    const now = new Date();
    const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'bot',
      content: `Great! Your demo has been booked. 🎉<br/><br/>We've sent a confirmation <strong>Mail</strong> <br/><br/>If you have any questions, feel free to ask!`,
      timestamp: timeString
    }]);

    // Exit booking flow
    setIsBookingFlow(false);

    // Reset to default chips
    setChips([
      { label: "Book a Demo", action: "message", value: "Book a Demo" },
      { label: "Pricing", action: "message", value: "Pricing" },
      { label: "About", action: "message", value: "About" }
    ]);
  };

  const handleBookingCancel = () => {
    // Add a message and exit booking flow
    const now = new Date();
    const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'bot',
      content: `No problem! If you'd like to book a demo later, just let me know. 😊`,
      timestamp: timeString
    }]);

    setIsBookingFlow(false);

    // Reset to default chips
    setChips([
      { label: "Book a Demo", action: "message", value: "Book a Demo" },
      { label: "Pricing", action: "message", value: "Pricing" },
      { label: "About", action: "message", value: "About" }
    ]);
  };

  return (
    <div className="chatbot-container">
      {/* Floating Action Button */}
      {!isOpen && !hideFab && (
        <button 
          className="chat-fab animate-fade-in" 
          onClick={toggleChat}
          aria-label="Open WhatsApp chat"
        >
          <img 
            src="/logo.jpg" 
            alt="WhatsApp Chat" 
            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
          />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window animate-slide-up">
          {/* Header */}
          <div className="chat-header">
            <div className="header-info">
              <div className="bot-avatar-header">
                <img src="/logo.jpg" alt="Wacto" style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} />
              </div>
              <div>
                <h3 className="bot-name">Wacto</h3>
                <span className="bot-status">Online</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="close-btn" onClick={toggleChat} aria-label="Close chat">
                <Minus size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            className="chat-messages"
            ref={chatMessagesRef}
            onScroll={handleChatScroll}
          >
            <div className="message-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                  {msg.role === 'bot' && (
                    <div className="message-header">
                      <div className="msg-avatar bot">
                        <img src="/logo.jpg" alt="Wacto" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      </div>
                      <span className="message-timestamp">{msg.timestamp}</span>
                    </div>
                  )}
                  
                  <div className={`message-bubble ${msg.role}`}>
                    {msg.role === 'bot' ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: msg.content
                        }}
                      />
                      ) : (
                      msg.content
                    )}
                    
                    {/* user avatar removed from sent messages per design */}
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className="user-meta">
                      <span>{msg.timestamp}</span>
                      <CheckCheck size={14} color="#8b5cf6" />
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="message-wrapper bot">
                  <div className="message-header">
                    <div className="msg-avatar bot">
                      <img src="/logo.jpg" alt="Wacto" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    </div>
                  </div>
                  <div className="typing-indicator-bubble">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Auto-scroll to bottom button */}
            {!isAtBottom && (
              <button
                className="scroll-to-bottom-btn"
                onClick={scrollToBottom}
                title="Scroll to latest messages"
                aria-label="Scroll to latest messages"
              >
                <ChevronDown size={18} />
              </button>
            )}
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            {isBookingFlow ? (
              <BookingFlow 
                onComplete={handleBookingComplete}
                onCancel={handleBookingCancel}
              />
            ) : (
              <>
                {/* Horizontally Scrollable Chips Container */}
                <div className="chips-wrapper" ref={chipsContainerRef}>
                  <div 
                    className="chips-scroll-container"
                    ref={chipsScrollRef}
                    onMouseDown={handleChipsMouseDown}
                    onMouseMove={handleChipsMouseMove}
                    onMouseUp={handleChipsMouseUp}
                    onMouseLeave={handleChipsMouseUp}
                    onTouchStart={handleChipsTouchStart}
                    onTouchMove={handleChipsTouchMove}
                    onTouchEnd={handleChipsTouchEnd}
                  >
                    {chips.map((chip, index) => (
                      <button 
                        key={index}
                        className="suggestion-chip"
                        onClick={() => handleChipClick(chip)}
                        title={chip.label}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
                <form onSubmit={handleSendMessage} className="input-form">
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Type your message here..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className={`send-btn ${inputMessage.trim() ? 'active' : ''}`}
                    disabled={!inputMessage.trim() || isTyping}
                  >
                    <Send size={20} />
                  </button>
                </form>
                <div className="powered-by">Powered by <strong>Wacto</strong></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
