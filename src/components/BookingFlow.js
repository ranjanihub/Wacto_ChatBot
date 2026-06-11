"use client";

import React, { useState } from 'react';
import { Check, AlertCircle, Loader } from 'lucide-react';

export default function BookingFlow({ onComplete, onCancel }) {
  const [step, setStep] = useState('name'); // name, email, phone, otp, confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    otpCode: '',
    sessionToken: '',
  });

  // Input handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  // Step 1: Name
  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setStep('email');
  };

  // Step 2: Email
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    setStep('phone');
  };

  // Step 3: Phone
  const handlePhoneSubmit = async (e) => {
    console.log("🔥 HANDLE PHONE SUBMIT FIRED");
    e.preventDefault();
    if (!formData.phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Validate phone format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('Please use format: +1234567890 or +919876543210');
      return;
    }

    setLoading(true);
    try {
      console.log("📤 SENDING OTP REQUEST");
      const response = await fetch('/api/booking/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
        }),
      });

      const data = await response.json();
      console.log("📥 OTP RESPONSE", data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setFormData(prev => ({
        ...prev,
        sessionToken: data.sessionToken,
      }));

      // In development, show debug OTP
      if (data.debug_otp) {
        console.log(`🔐 Debug OTP for ${formData.phoneNumber}: ${data.debug_otp}`);
      }

      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: OTP Verification
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (!formData.otpCode.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    if (formData.otpCode.trim().length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/booking/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: formData.sessionToken,
    otpCode: formData.otpCode,
  }),
});

const text = await response.text();

console.log("VERIFY OTP RAW RESPONSE:", text);

let data = {};

try {
  data = text ? JSON.parse(text) : {};
} catch (err) {
  console.error("INVALID JSON FROM VERIFY OTP:", text);
  throw new Error("Server returned invalid JSON");
}

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      // Submit booking
      await submitBooking();
    } catch (err) {
      setError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Booking
  const submitBooking = async () => {
    try {
      const response = await fetch('/api/booking/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          sessionToken: formData.sessionToken,
          otpCode: formData.otpCode,
        }),
      });

      const text = await response.text();
      console.log("SUBMIT RESPONSE:", text);
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit booking');
      }

      setStep('confirmation');

      // Auto-redirect to Calendly after 2 seconds
      setTimeout(() => {
        if (data.calendlyLink) {
          window.open(data.calendlyLink, '_blank');
        }
        // Notify parent component
        if (onComplete) {
          onComplete(data);
        }
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to complete booking');
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'name':
        return (
          <div className="booking-step">
            <p className="booking-question">What's your name?</p>
            <form onSubmit={handleNameSubmit} className="booking-form">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="booking-input"
                autoFocus
              />
              <button type="submit" className="booking-submit-btn">
                Next
              </button>
            </form>
          </div>
        );

      case 'email':
        return (
          <div className="booking-step">
            <p className="booking-question">What's your email address?</p>
            <form onSubmit={handleEmailSubmit} className="booking-form">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className="booking-input"
                autoFocus
              />
              <button type="submit" className="booking-submit-btn">
                Next
              </button>
            </form>
          </div>
        );

      case 'phone':
        return (
          <div className="booking-step">
            <p className="booking-question">What's your phone number?</p>
            <p className="booking-hint">Format: +1234567890 or +919876543210</p>
            <form onSubmit={handlePhoneSubmit} className="booking-form">
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1 (555) 000-0000"
                className="booking-input"
                autoFocus
              />
              <button
                type="submit"
                className="booking-submit-btn"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          </div>
        );

      case 'otp':
        return (
          <div className="booking-step">
            <p className="booking-question">Enter the 6-digit OTP</p>
            <p className="booking-hint">Check your SMS for the code</p>
            <form onSubmit={handleOTPSubmit} className="booking-form">
              <input
                type="text"
                name="otpCode"
                value={formData.otpCode}
                onChange={(e) =>
                  handleInputChange({
                    target: { name: 'otpCode', value: e.target.value.slice(0, 6) }
                  })
                }
                placeholder="000000"
                className="booking-input booking-otp-input"
                maxLength="6"
                autoFocus
              />
              <button
                type="submit"
                className="booking-submit-btn"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          </div>
        );

      case 'confirmation':
        return (
          <div className="booking-step booking-confirmation">
            <div className="confirmation-icon">
              <Check size={48} color="#27ae60" />
            </div>
            <p className="confirmation-title">Demo Booked! 🎉</p>
            <p className="confirmation-text">
              Thanks {formData.name}! We've sent a confirmation email to <strong>{formData.email}</strong>.
            </p>
            <p className="confirmation-text">
              Redirecting you to Calendly to schedule your demo...
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="booking-container">
      {error && (
        <div className="booking-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {renderStepContent()}

      {step !== 'confirmation' && (
        <div className="booking-footer">
          <button
            onClick={onCancel}
            className="booking-cancel-btn"
            disabled={loading}
          >
            Cancel
          </button>
          {step !== 'name' && (
            <button
              onClick={() => {
                const steps = ['name', 'email', 'phone', 'otp'];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1]);
                  setError('');
                }
              }}
              className="booking-back-btn"
              disabled={loading}
            >
              Back
            </button>
          )}
        </div>
      )}
    </div>
  );
}
