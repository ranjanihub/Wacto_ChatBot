# Dynamic Suggestion Chips System Documentation

## Overview
The chatbot now features a dynamic, horizontally scrollable suggestion chip system that updates based on user intent detection. This system provides contextual action chips that help guide user interactions.

## Features Implemented

### 1. **Horizontal Scrollable Chips Container**
- **Touch Support**: Full swipe/drag support on mobile devices
- **Mouse Support**: Click and drag to scroll on desktop
- **Smooth Scrolling**: CSS 3 smooth scroll behavior
- **Hidden Scrollbar**: Clean UI with `scrollbar-width: thin` for Firefox and webkit scrollbar styling
- **No Text Wrapping**: `white-space: nowrap` ensures chips stay in a single line

### 2. **Modern Chip Design**
- Gradient background: Purple to violet (`#667eea` → `#764ba2`)
- Smooth hover animation: `translateY(-2px)` with enhanced shadow
- Active state: Subtle press-down effect
- Responsive sizing across mobile, tablet, and desktop
- White text on gradient background for high contrast

### 3. **Intent-Based Chip Generation**

#### Pricing Intent
Triggered by keywords: `pricing`, `cost`, `price`, `plans`, `tariff`, `investment`, `subscription`, `pay`, `payment`

**Chips Shown**:
- "View Pricing" → Opens https://wacto.in/best-whatsapp-business-api-pricing-india/
- "Compare Plans" → Sends message "Show pricing comparison"
- "Talk to Sales" → Sends message "Connect me with sales"
- "Enterprise Plan" → Sends message "Tell me about enterprise pricing"

#### Services Intent
Triggered by keywords: `service`, `feature`, `chatbot`, `automation`, `integration`, `whatsapp`, `api`, `bot`, `solution`

**Chips Shown**:
- "AI Chatbot Features" → Sends message "What are the chatbot features?"
- "Book Demo" → Sends message "I'd like to book a demo"
- "Automation Services" → Sends message "Tell me about automation services"
- "Website Integration" → Sends message "How to integrate with my website?"

#### Support Intent
Triggered by keywords: `support`, `contact`, `help`, `reach`, `call`, `meeting`, `demo`, `enquiry`, `question`, `issue`

**Chips Shown**:
- "Contact Team" → Sends message "I need to contact the support team"
- "Raise Enquiry" → Sends message "I want to raise an enquiry"
- "Schedule Call" → Sends message "Schedule a call with the team"
- "FAQs" → Opens FAQs page

#### General Intent (Default)
Used when no specific intent is detected.

**Chips Shown**:
- "Learn More"
- "How does it work?"
- "Get Started"
- "Contact Support"

### 4. **Chip Actions**

Chips support three action types:

```javascript
{
  label: "Display Text",
  action: "url|message|send",  // Type of action
  value: "URL or message text"  // Action value
}
```

- **`url`**: Opens a link in a new tab
- **`message`**: Fills the input field with the message (user can edit before sending)
- **`send`**: Directly sends the message without user editing

## API Response Format

The backend now returns chips in the following structured format:

```json
{
  "reply": "Our WhatsApp API pricing starts from...",
  "detectedIntent": "pricing",
  "chips": [
    {
      "label": "View Pricing",
      "action": "url",
      "value": "https://wacto.in/best-whatsapp-business-api-pricing-india/"
    },
    {
      "label": "Compare Plans",
      "action": "message",
      "value": "Show pricing comparison"
    },
    {
      "label": "Talk to Sales",
      "action": "message",
      "value": "Connect me with sales"
    }
  ],
  "source": "n8n-ollama",
  "detectedLanguage": "en"
}
```

## Frontend Components

### Chatbot.js Changes
1. **State Management**:
   - Changed from `suggestions` to `chips` state
   - Added refs for horizontal scrolling: `chipsScrollRef`, `touchStartRef`, `scrollLeftRef`

2. **New Functions**:
   - `handleChipClick()`: Routes chip actions to appropriate handlers
   - `sendMessage()`: Extracted message sending logic for reuse
   - `handleChipsMouseDown/Move/Up()`: Desktop scroll handling
   - `handleChipsTouchStart/Move/End()`: Mobile touch handling

3. **Gesture Support**:
   - Mouse drag scrolling
   - Touch swipe scrolling
   - Smooth scroll behavior when idle

### Chatbot.css Changes
1. **New Classes**:
   - `.chips-wrapper`: Container with overflow handling
   - `.chips-scroll-container`: Flex container with smooth scrolling
   - `.suggestion-chip`: Individual chip styling with gradient and animations

2. **Scroll Behavior**:
   - `scroll-behavior: smooth` for smooth scrolling
   - `-webkit-overflow-scrolling: touch` for iOS momentum
   - Custom scrollbar styling hidden by default

3. **Responsive Design**:
   - Mobile: Reduced padding and font size on screens < 480px
   - Tablet/Desktop: Full chip display with hover effects

## Backend Implementation

### route.js Changes
1. **Intent Detection Function**:
   ```javascript
   function detectIntent(message) {
     // Analyzes message for pricing, services, support, or general intent
   }
   ```

2. **Chip Generation Function**:
   ```javascript
   function generateChips(intent, botReply = '') {
     // Returns contextual chips based on detected intent
   }
   ```

3. **Enhanced API Response**:
   - All responses now include `chips` array
   - Intent detection passed to n8n via metadata
   - Support for chips from n8n response or generated locally

## User Experience Benefits

✅ **Contextual Guidance**: Users see relevant actions based on their queries
✅ **Smooth Interaction**: Horizontal scrolling and swipe support for mobile
✅ **Visual Feedback**: Hover and active states provide clear interactive feedback
✅ **Mobile-First**: Touch-optimized with fallback to mouse support
✅ **Accessibility**: Semantic HTML buttons with proper labels
✅ **Dynamic Updates**: Chips refresh after every user interaction

## Customization

### Adding New Intents
Edit `generateChips()` in [route.js](src/app/api/chat/route.js#L33):

```javascript
yourIntent: [
  { label: "Action 1", action: "message", value: "Message text" },
  { label: "Action 2", action: "url", value: "https://example.com" }
]
```

### Styling Customization
Edit `.suggestion-chip` in [Chatbot.css](src/components/Chatbot.css#L54):

```css
.suggestion-chip {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Modify colors, padding, border-radius here */
}
```

### Intent Keywords
Modify regex patterns in `detectIntent()` function to add or remove keywords.

## Fallback Behavior

- If no intent is detected: Shows general suggestion chips
- If API returns custom chips: Uses those instead of generated ones
- If n8n returns error: Shows support-related chips to help user
- Mobile devices without touch support: Use mouse drag scrolling

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Mobile Safari |
|---------|--------|---------|--------|---------------|
| Smooth Scroll | ✅ | ✅ | ✅ | ✅ |
| Touch Gestures | ✅ | ✅ | ✅ | ✅ |
| Momentum Scrolling | ✅ | ✅ | ✅ | ✅ |
| Custom Scrollbar | ✅ | ✅ | ⚠️ Limited | ⚠️ Limited |

## Performance Considerations

- Chips are memoized via React re-render optimization
- Mouse move events use efficient event delegation
- Touch events use passive listeners for scroll performance
- CSS animations use GPU-accelerated transforms

## Testing the Implementation

1. **Test Pricing Intent**:
   ```
   User: "What's your pricing?"
   Expected: Pricing-related chips appear
   ```

2. **Test Services Intent**:
   ```
   User: "Tell me about chatbot features"
   Expected: Services-related chips appear
   ```

3. **Test Mobile Swipe**:
   - Open on mobile device
   - Swipe left/right on chips container
   - Chips should scroll smoothly

4. **Test Chip Actions**:
   - Click URL chip → Should open new tab
   - Click message chip → Should fill input field
   - Send message chip → Should send directly

## Future Enhancements

- [ ] Analytics tracking for chip clicks
- [ ] A/B testing different chip layouts
- [ ] Voice input for chip selection
- [ ] Chip animations with Framer Motion
- [ ] Keyboard navigation (arrow keys)
- [ ] Chip search/filter for many chips
- [ ] Custom chip themes per company

## File References

- **Frontend Component**: [Chatbot.js](src/components/Chatbot.js)
- **Frontend Styles**: [Chatbot.css](src/components/Chatbot.css)
- **Backend API**: [route.js](src/app/api/chat/route.js)
