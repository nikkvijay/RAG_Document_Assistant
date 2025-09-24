import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../services/api.service';
import { ChatMessage } from '../../models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container h-96 flex flex-col">
      <!-- Chat Messages -->
      <div class="chat-messages flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border rounded-lg mb-4" #chatContainer>
        <!-- Welcome Message -->
        <div *ngIf="messages().length === 0" class="text-center py-8 text-gray-600">
          {{ documentsReady ? 'Ask questions about your documents' : 'Upload documents first' }}
        </div>

        <!-- Chat Messages -->
        <div *ngFor="let message of messages(); trackBy: trackByMessageId"
             class="message"
             [class]="message.type === 'user' ? 'message-user' : 'message-assistant'">

          <!-- User Message -->
          <div *ngIf="message.type === 'user'" class="flex justify-end">
            <div class="message-bubble bg-indigo-600 text-white">
              {{ message.content }}
            </div>
          </div>

          <!-- Assistant Message -->
          <div *ngIf="message.type === 'assistant'" class="flex justify-start">
            <div class="message-bubble bg-white border text-gray-900">
              <div *ngIf="message.isLoading" class="text-gray-500">Thinking...</div>
              <div *ngIf="!message.isLoading">{{ message.content }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Input -->
      <div class="chat-input">
        <form (ngSubmit)="sendMessage()" class="flex space-x-3">
          <div class="flex-1 relative">
            <input
              type="text"
              [(ngModel)]="currentMessage"
              [ngModelOptions]="{standalone: true}"
              [disabled]="!documentsReady || isLoading()"
              placeholder="{{ documentsReady ? 'Ask a question...' : 'Upload documents first' }}"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
            <div *ngIf="isLoading()" class="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div class="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          </div>
          <button
            type="submit"
            [disabled]="!currentMessage.trim() || !documentsReady || isLoading()"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            <svg *ngIf="!isLoading()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
            <div *ngIf="isLoading()" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </button>
        </form>

      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      max-height: 500px;
    }

    .chat-messages {
      min-height: 300px;
    }

    .message-bubble {
      @apply px-4 py-2 rounded-lg max-w-xs break-words;
    }

    .message-user .message-bubble {
      @apply ml-auto;
    }

  `]
})
export class ChatComponent {
  @Input() documentsReady = false;

  messages = signal<ChatMessage[]>([]);
  currentMessage = '';
  isLoading = signal(false);

  constructor(private apiService: ApiService) {}

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || !this.documentsReady || this.isLoading()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content: this.currentMessage.trim(),
      timestamp: new Date()
    };

    const loadingMessage: ChatMessage = {
      id: this.generateId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    };

    // Add messages
    this.messages.update(msgs => [...msgs, userMessage, loadingMessage]);

    const question = this.currentMessage.trim();
    this.currentMessage = '';
    this.isLoading.set(true);

    // Call API
    this.apiService.queryDocuments(question).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        // Update loading message with response
        this.messages.update(msgs =>
          msgs.map(msg =>
            msg.id === loadingMessage.id
              ? {
                  ...msg,
                  content: response.answer,
                  sourceDocuments: response.sourceDocuments,
                  isLoading: false
                }
              : msg
          )
        );

        this.scrollToBottom();
      },
      error: (error) => {
        this.isLoading.set(false);

        // Update loading message with error
        this.messages.update(msgs =>
          msgs.map(msg =>
            msg.id === loadingMessage.id
              ? {
                  ...msg,
                  content: 'Sorry, I encountered an error processing your question. Please try again.',
                  isLoading: false
                }
              : msg
          )
        );

        console.error('Chat error:', error);
      }
    });

    this.scrollToBottom();
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  getUniqueDocuments(sourceDocuments: any[]): string[] {
    const uniqueDocs = new Set<string>();
    sourceDocuments.forEach(doc => {
      if (doc.metadata?.source) {
        uniqueDocs.add(doc.metadata.source);
      }
    });
    return Array.from(uniqueDocs);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}