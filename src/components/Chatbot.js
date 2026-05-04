"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Minus, Send, Bot, User, Copy, ThumbsUp, ThumbsDown, Check, CheckCheck } from 'lucide-react';
import './Chatbot.css';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(true); // Open by default for preview
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const now = new Date();
    const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
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
          history: messages,
          language: 'en'
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch response');
      
      const data = await response.json();
      
      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        content: data.reply || 'Sorry, I am having trouble connecting right now.',
        timestamp: timeString
      };
      
      setMessages(prev => [...prev, botMsg]);
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

  return (
    <div className="chatbot-container">
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          className="chat-fab animate-fade-in" 
          onClick={toggleChat}
          aria-label="Open chat"
        >
          <MessageCircle size={28} color="#fff" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window animate-slide-up">
          {/* Header */}
          <div className="chat-header">
            <div className="header-info">
              <div className="bot-avatar-header">
                <img src="/logo.jpg" alt="Wacto" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div>
                <h3 className="bot-name">Wacto</h3>
                <span className="bot-status">Online</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="close-btn" onClick={toggleChat}>
                <Minus size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="chat-messages">
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
                    {msg.content}
                    
                    {msg.role === 'bot' && (
                      <div className="bot-actions">
                        <button className="bot-action-btn" title="Copy"><Copy size={14} /></button>
                        <button className="bot-action-btn" title="Helpful"><ThumbsUp size={14} /></button>
                        <button className="bot-action-btn" title="Not Helpful"><ThumbsDown size={14} /></button>
                      </div>
                    )}

                    {msg.role === 'user' && (
                      <div className="user-avatar-overlay">
                        <User size={20} color="#e2e8f0" fill="currentColor" />
                      </div>
                    )}
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
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="quick-actions">
              <button className="action-chip" onClick={() => setInputMessage('What is WhatsApp API?')}>🤔 What is WhatsApp API?</button>
              <button className="action-chip" onClick={() => setInputMessage('Pricing')}>💰 Pricing</button>
              <button className="action-chip" onClick={() => setInputMessage('FAQs')}>🙋 FAQs</button>
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
          </div>
        </div>
      )}
    </div>
  );
}
