// Chat Overlay Component for HTML Landing Page
class ChatOverlay {
  constructor() {
    this.state = 'hidden'; // hidden, minimized, sidebar, fullscreen
    this.businessType = null;
    this.messages = [];
    this.isLoading = false;
    this.currentStep = 'business_description';
    this.profileData = {};
    this.isMobile = window.innerWidth < 768;
    
    this.createOverlay();
    this.setupEventListeners();
  }

  createOverlay() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'chat-overlay';
    this.container.className = 'chat-overlay-hidden';
    document.body.appendChild(this.container);

    // Add CSS styles
    this.addStyles();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .chat-overlay-hidden { display: none; }
      
      .chat-overlay-minimized {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 1000;
      }
      
      .chat-overlay-form {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .form-modal {
        background: white;
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px rgba(0,0,0,0.25);
      }
      
      .chat-overlay-minimized .chat-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #2563eb, #9333ea);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
      }
      
      .chat-overlay-minimized .chat-icon:hover {
        transform: scale(1.05);
        box-shadow: 0 15px 35px rgba(0,0,0,0.2);
      }
      
      .chat-overlay-fullscreen {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: white;
        display: flex;
        flex-direction: column;
      }
      
      .chat-overlay-sidebar {
        position: fixed;
        top: 0;
        right: 0;
        width: 384px;
        height: 100vh;
        z-index: 1000;
        background: white;
        border-left: 1px solid #e2e8f0;
        box-shadow: -10px 0 25px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
      }
      
      @media (max-width: 768px) {
        .chat-overlay-sidebar {
          width: 100vw;
          border-left: none;
        }
      }
      
      .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #e2e8f0;
        background: white;
      }
      
      .chat-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .chat-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #2563eb, #9333ea);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      
      .chat-title {
        font-weight: 600;
        color: #1e293b;
        margin: 0;
        font-size: 14px;
      }
      
      .chat-subtitle {
        font-size: 12px;
        color: #64748b;
        margin: 0;
      }
      
      .chat-controls {
        display: flex;
        gap: 8px;
      }
      
      .chat-btn {
        background: none;
        border: none;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        color: #64748b;
        transition: color 0.2s;
      }
      
      .chat-btn:hover {
        color: #334155;
      }
      
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8fafc;
      }
      
      .message {
        margin-bottom: 16px;
        display: flex;
      }
      
      .message.user {
        justify-content: flex-end;
      }
      
      .message.ai {
        justify-content: flex-start;
      }
      
      .message-content {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .message.user .message-content {
        background: #2563eb;
        color: white;
      }
      
      .message.ai .message-content {
        background: white;
        color: #1e293b;
        border: 1px solid #e2e8f0;
      }
      
      .message-time {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 4px;
        display: block;
      }
      
      .chat-input-area {
        padding: 16px;
        border-top: 1px solid #e2e8f0;
        background: white;
      }
      
      .chat-input-container {
        display: flex;
        gap: 8px;
      }
      
      .chat-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      
      .chat-input:focus {
        border-color: #2563eb;
      }
      
      .chat-send-btn {
        padding: 12px 16px;
        background: linear-gradient(135deg, #2563eb, #9333ea);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .chat-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .typing-indicator {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        width: fit-content;
      }
      
      .typing-dot {
        width: 8px;
        height: 8px;
        background: #64748b;
        border-radius: 50%;
        animation: typing 1.5s infinite;
      }
      
      .typing-dot:nth-child(2) { animation-delay: 0.1s; }
      .typing-dot:nth-child(3) { animation-delay: 0.2s; }
      
      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-10px); }
      }
      
      .form-header {
        padding: 24px;
        text-align: center;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .form-title {
        font-size: 20px;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 8px 0;
      }
      
      .form-subtitle {
        font-size: 14px;
        color: #64748b;
        margin: 0;
      }
      
      .form-progress {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-top: 16px;
      }
      
      .progress-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #e2e8f0;
        transition: background 0.3s;
      }
      
      .progress-dot.active {
        background: #2563eb;
      }
      
      .form-content {
        padding: 32px 24px;
      }
      
      .form-question {
        font-size: 16px;
        font-weight: 500;
        color: #1e293b;
        margin-bottom: 16px;
        line-height: 1.5;
      }
      
      .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
        margin-bottom: 20px;
        box-sizing: border-box;
      }
      
      .form-input:focus {
        border-color: #2563eb;
      }
      
      .form-textarea {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
        margin-bottom: 20px;
        min-height: 80px;
        resize: vertical;
        font-family: inherit;
        box-sizing: border-box;
      }
      
      .form-textarea:focus {
        border-color: #2563eb;
      }
      
      .form-actions {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      
      .form-btn {
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      
      .form-btn-secondary {
        background: #f1f5f9;
        color: #64748b;
      }
      
      .form-btn-secondary:hover {
        background: #e2e8f0;
      }
      
      .form-btn-primary {
        background: linear-gradient(135deg, #2563eb, #9333ea);
        color: white;
        flex: 1;
      }
      
      .form-btn-primary:hover:not(:disabled) {
        opacity: 0.9;
      }
      
      .form-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
      if (this.state === 'sidebar' && this.isMobile) {
        this.setState('fullscreen');
      }
    });
  }

  setState(newState) {
    this.state = newState;
    this.container.className = `chat-overlay-${newState}`;
    this.render();
  }

  initializeChat(type) {
    this.businessType = type;
    this.currentStep = 1;
    this.formData = {
      productService: '',
      customerFeedback: '',
      website: ''
    };
    
    this.setState('form');
  }

  render() {
    if (this.state === 'hidden') {
      this.container.innerHTML = '';
      return;
    }

    if (this.state === 'minimized') {
      this.container.innerHTML = `
        <button class="chat-icon" onclick="chatOverlay.setState('${this.isMobile ? 'fullscreen' : 'sidebar'}')">
          💬
        </button>
      `;
      return;
    }

    if (this.state === 'form') {
      this.renderForm();
      return;
    }

    // Render full chat interface
    this.container.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-avatar">💬</div>
          <div>
            <p class="chat-title">Strategic Planning Assistant</p>
            <p class="chat-subtitle">${this.businessType ? `Creating your ${this.businessType} strategy` : 'Ready to help'}</p>
          </div>
        </div>
        <div class="chat-controls">
          ${this.state === 'fullscreen' && !this.isMobile ? `
            <button class="chat-btn" onclick="chatOverlay.setState('sidebar')" title="Minimize">
              📐
            </button>
          ` : ''}
          ${this.state === 'sidebar' ? `
            <button class="chat-btn" onclick="chatOverlay.setState('fullscreen')" title="Maximize">
              📏
            </button>
          ` : ''}
          <button class="chat-btn" onclick="chatOverlay.handleClose()" title="Close">
            ✕
          </button>
        </div>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        ${this.renderMessages()}
      </div>
      
      <div class="chat-input-area">
        <div class="chat-input-container">
          <input 
            type="text" 
            class="chat-input" 
            id="chat-input" 
            placeholder="Type your message..."
            onkeydown="if(event.key==='Enter') chatOverlay.sendMessage()"
            ${this.isLoading ? 'disabled' : ''}
          >
          <button 
            class="chat-send-btn" 
            onclick="chatOverlay.sendMessage()"
            ${this.isLoading ? 'disabled' : ''}
          >
            Send
          </button>
        </div>
      </div>
    `;

    // Scroll to bottom
    setTimeout(() => {
      const messagesContainer = document.getElementById('chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  renderMessages() {
    let html = '';
    
    this.messages.forEach(message => {
      const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="message ${message.sender}">
          <div class="message-content">
            ${message.content.replace(/\n/g, '<br>')}
            <span class="message-time">${time}</span>
          </div>
        </div>
      `;
    });

    if (this.isLoading) {
      html += `
        <div class="message ai">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      `;
    }

    return html;
  }

  handleClose() {
    if (this.state === 'fullscreen') {
      this.setState(this.isMobile ? 'minimized' : 'sidebar');
    } else if (this.state === 'sidebar') {
      this.setState('minimized');
    }
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || this.isLoading) return;

    // Add user message
    this.messages.push({
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    });

    input.value = '';
    this.isLoading = true;
    this.render();

    try {
      // Call API
      const response = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          businessType: this.businessType,
          currentStep: this.currentStep,
          profileData: this.profileData,
          conversationHistory: this.messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      if (data.aiResponse) {
        this.messages.push({
          id: (Date.now() + 1).toString(),
          content: data.aiResponse,
          sender: 'ai',
          timestamp: new Date()
        });
      }

      if (data.profileUpdate) {
        this.profileData = { ...this.profileData, ...data.profileUpdate };
      }

      if (data.nextStep) {
        this.currentStep = data.nextStep;
      }

    } catch (error) {
      console.error('Error sending message:', error);
      this.messages.push({
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble processing your message right now. Please try again.",
        sender: 'ai',
        timestamp: new Date()
      });
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  renderForm() {
    const questions = [
      {
        title: "What is the product/service you sell?",
        subtitle: "Describe it in 1 sentence",
        field: "productService",
        type: "textarea",
        placeholder: "Example: We sell premium coffee machines for small offices..."
      },
      {
        title: "What do customers say they like?",
        subtitle: "What is one thing customers like about your product or the way you sell it?",
        field: "customerFeedback",
        type: "textarea",
        placeholder: "Example: They love our fast delivery and easy setup..."
      },
      {
        title: "Where can we learn more?",
        subtitle: "Do you have a website, or any page online (Etsy, FB, or any link) that explains your product/service?",
        field: "website",
        type: "input",
        placeholder: "Example: https://mycompany.com or https://etsy.com/shop/mystore"
      }
    ];

    const currentQuestion = questions[this.currentStep - 1];
    const currentValue = this.formData[currentQuestion.field];
    const isValid = currentValue && currentValue.trim().length > 0;

    this.container.innerHTML = `
      <div class="form-modal">
        <div class="form-header">
          <h2 class="form-title">Let's get to know your business</h2>
          <p class="form-subtitle">Just 3 quick questions to create your strategy</p>
          <div class="form-progress">
            ${[1, 2, 3].map(step => `
              <div class="progress-dot ${step <= this.currentStep ? 'active' : ''}"></div>
            `).join('')}
          </div>
        </div>
        
        <div class="form-content">
          <div class="form-question">${currentQuestion.title}</div>
          <p style="color: #64748b; margin-bottom: 20px; font-size: 14px;">${currentQuestion.subtitle}</p>
          
          ${currentQuestion.type === 'textarea' ? `
            <textarea 
              class="form-textarea" 
              placeholder="${currentQuestion.placeholder}"
              id="form-input"
            >${currentValue || ''}</textarea>
          ` : `
            <input 
              type="text" 
              class="form-input" 
              placeholder="${currentQuestion.placeholder}"
              id="form-input"
              value="${currentValue || ''}"
            />
          `}
          
          <div class="form-actions">
            ${this.currentStep > 1 ? `
              <button class="form-btn form-btn-secondary" onclick="chatOverlay.previousStep()">
                Back
              </button>
            ` : `
              <button class="form-btn form-btn-secondary" onclick="chatOverlay.setState('hidden')">
                Cancel
              </button>
            `}
            
            <button 
              class="form-btn form-btn-primary" 
              onclick="chatOverlay.nextStep()"
              ${!isValid ? 'disabled' : ''}
            >
              ${this.currentStep === 3 ? 'Start Chat' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listener for real-time validation
    const input = document.getElementById('form-input');
    if (input) {
      input.addEventListener('input', () => {
        this.formData[currentQuestion.field] = input.value;
        this.updateFormButton();
      });
    }
  }

  updateFormButton() {
    const questions = [
      { field: "productService" },
      { field: "customerFeedback" },
      { field: "website" }
    ];
    
    const currentQuestion = questions[this.currentStep - 1];
    const currentValue = this.formData[currentQuestion.field];
    const isValid = currentValue && currentValue.trim().length > 0;
    
    const button = document.querySelector('.form-btn-primary');
    if (button) {
      button.disabled = !isValid;
    }
  }

  nextStep() {
    const input = document.getElementById('form-input');
    if (input) {
      const questions = [
        { field: "productService" },
        { field: "customerFeedback" },
        { field: "website" }
      ];
      
      const currentQuestion = questions[this.currentStep - 1];
      this.formData[currentQuestion.field] = input.value;
    }

    if (this.currentStep === 3) {
      // Transition to chat with initial message
      this.messages = [{
        id: Date.now().toString(),
        content: `Hey, that's awesome!\n\nI'm just doing research into the market and getting to know your product better.\n\nIn the meantime, could you tell me, what is an example of a customer of yours?\n\nFor example, a specific hotel, company, department, or profession.\nExample: Four Seasons in Midtown New York uses our leased coffee machines.\nUX Design Freelancers use our invoicing SaaS platform.\n\nI'm trying to get a clearer snapshot of who really needs or appreciates what you are selling.`,
        sender: 'ai',
        timestamp: new Date()
      }];
      
      this.setState(this.isMobile ? 'fullscreen' : 'fullscreen');
    } else {
      this.currentStep++;
      this.renderForm();
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderForm();
    }
  }
}

// Initialize chat overlay when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.chatOverlay = new ChatOverlay();
});

// Global function for HTML buttons to call
window.openChat = function(type) {
  if (window.chatOverlay) {
    window.chatOverlay.initializeChat(type);
  }
};