import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col">
      <!-- Main Content -->
      <main class="flex-1 flex flex-col items-center justify-center p-4">
        <div class="max-w-4xl w-full mx-auto text-center">
          <h1 class="text-4xl font-bold text-gray-900 mb-6">Welcome to RAG Assistant</h1>
          <p class="text-lg text-gray-600 mb-8">
            Upload your documents and chat with your data using AI-powered retrieval-augmented generation.
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 class="text-xl font-semibold mb-3">Upload Documents</h2>
              <p class="text-gray-600 mb-4">Upload your PDFs, Word docs, or text files to get started.</p>
              <a 
                routerLink="/upload" 
                class="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Go to Upload
              </a>
            </div>
            
            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 class="text-xl font-semibold mb-3">Chat with Documents</h2>
              <p class="text-gray-600 mb-4">Ask questions and get answers based on your uploaded documents.</p>
              <a 
                routerLink="/chat" 
                class="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Start Chatting
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class HomeComponent { }
