import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class RAGService {
  constructor() {
    this.vectorStore = null;
    this.retriever = null;
    this.documents = [];

    // Initialize Gemini
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Initialize embeddings
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: config.geminiApiKey,
      model: 'text-embedding-004',
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });

    logger.info('RAG Service initialized with Gemini AI');
  }

  // No longer need complex chain initialization with Gemini

  async processDocument(filePath, options = {}) {
    try {
      const { mode = 'replace' } = options; // 'replace' or 'append'
      logger.info(`Processing document: ${filePath} (mode: ${mode})`);

      // Load the PDF
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();

      if (!docs || docs.length === 0) {
        throw new AppError('Failed to extract content from PDF', 400);
      }

      // Add source metadata to identify the document
      // Handle both Windows and Unix path separators
      let fullFileName;
      if (filePath.includes('\\')) {
        fullFileName = filePath.split('\\').pop();
      } else if (filePath.includes('/')) {
        fullFileName = filePath.split('/').pop();
      } else {
        fullFileName = filePath;
      }

      // Remove timestamp prefix (e.g., "1758724334844-654713938-" from filename)
      const cleanFileName = fullFileName.replace(/^\d+-\d+-/, '');

      logger.info(`Original path: "${filePath}"`);
      logger.info(`Full filename: "${fullFileName}"`);
      logger.info(`Clean filename: "${cleanFileName}"`);

      docs.forEach(doc => {
        doc.metadata = {
          ...doc.metadata,
          source: cleanFileName,
          originalFileName: fullFileName,
          filePath: filePath,
          uploadedAt: new Date().toISOString()
        };
      });

      // Split the documents into chunks
      const splitDocs = await this.textSplitter.splitDocuments(docs);

      // Preserve metadata in chunks
      splitDocs.forEach((chunk, index) => {
        chunk.metadata = {
          ...chunk.metadata,
          source: cleanFileName,
          originalFileName: fullFileName,
          filePath: filePath,
          chunkIndex: index,
          uploadedAt: new Date().toISOString()
        };
      });

      logger.info(`Document "${cleanFileName}" split into ${splitDocs.length} chunks`);

      // Handle different modes
      if (mode === 'replace') {
        // REPLACE MODE: Clear existing documents and create new vector store
        logger.info('REPLACE MODE: Clearing existing documents and creating new vector store');
        this.vectorStore = await MemoryVectorStore.fromDocuments(
          splitDocs,
          this.embeddings
        );
        this.documents = []; // Clear document tracking
      } else if (mode === 'append') {
        // APPEND MODE: Add to existing vector store
        if (!this.vectorStore) {
          logger.info('APPEND MODE: Creating new vector store (no existing store)');
          this.vectorStore = await MemoryVectorStore.fromDocuments(
            splitDocs,
            this.embeddings
          );
        } else {
          logger.info(`APPEND MODE: Adding ${splitDocs.length} chunks to existing vector store`);
          await this.vectorStore.addDocuments(splitDocs);
        }
      }

      // Update retriever
      if (mode === 'replace') {
        // For single document, use fewer chunks for more focused results
        this.retriever = this.vectorStore.asRetriever({
          k: 5,
          searchType: 'similarity',
          searchKwargs: {
            fetchK: 10
          }
        });
      } else {
        // For multi-document, use more chunks for broader coverage
        this.retriever = this.vectorStore.asRetriever({
          k: 8,
          searchType: 'similarity',
          searchKwargs: {
            fetchK: 20
          }
        });
      }

      // Track document
      this.documents.push({
        fileName: cleanFileName,
        originalFileName: fullFileName,
        filePath,
        chunksCount: splitDocs.length,
        uploadedAt: new Date().toISOString(),
        mode: mode
      });

      const totalDocs = this.documents.length;
      const totalChunks = this.documents.reduce((sum, doc) => sum + doc.chunksCount, 0);

      const modeMessage = mode === 'replace'
        ? `Document "${cleanFileName}" processed (REPLACED previous documents)`
        : `Document "${cleanFileName}" processed (ADDED to existing documents)`;

      logger.info(`${modeMessage}. Total documents: ${totalDocs}, Total chunks: ${totalChunks}`);

      return {
        success: true,
        chunksCount: splitDocs.length,
        fileName: cleanFileName,
        originalFileName: fullFileName,
        totalDocuments: totalDocs,
        totalChunks: totalChunks,
        mode: mode,
        message: `${modeMessage}. Total: ${totalDocs} documents with ${totalChunks} chunks.`
      };
    } catch (error) {
      logger.error('Error processing document:', error);
      throw new AppError(`Failed to process document: ${error.message}`, 500);
    }
  }

  async query(question) {
    try {
      if (!this.retriever) {
        throw new AppError('No documents have been processed yet', 400);
      }

      logger.info(`Processing query: "${question}" across ${this.documents.length} documents`);

      // Retrieve relevant documents
      const relevantDocs = await this.retriever.getRelevantDocuments(question);

      logger.info(`Retrieved ${relevantDocs.length} relevant chunks from vector store`);

      // Group documents by source for better context organization
      const docsBySource = relevantDocs.reduce((acc, doc) => {
        const source = doc.metadata?.source || 'unknown';
        if (!acc[source]) {
          acc[source] = [];
        }
        acc[source].push(doc);
        return acc;
      }, {});

      // Log sources being used
      const sources = Object.keys(docsBySource);
      logger.info(`Using content from documents: ${sources.join(', ')}`);

      // Prepare context with source attribution
      const contextParts = Object.entries(docsBySource).map(([source, docs]) => {
        const content = docs.map(doc => doc.pageContent).join('\n');
        return `=== From document: ${source} ===\n${content}`;
      });

      const context = contextParts.join('\n\n');

      // Enhanced prompt for multi-document awareness
      const prompt = `
You are a helpful AI assistant that answers questions based on multiple documents.
Use the following pieces of context from different documents to answer the user's question.
When possible, mention which document(s) your answer comes from.
If information is available in multiple documents, synthesize a comprehensive answer.
If you don't know the answer based on the context, just say that you don't know.
Don't try to make up an answer.

Available Documents: ${sources.join(', ')}

Context:
${context}

Question: ${question}

Instructions:
- Provide a detailed answer based on the context above
- When relevant, mention which document(s) contain the information
- If multiple documents have related information, combine insights from all sources
- Be specific about what each document contributes to your answer

Answer:`;

      // Get response from Gemini with retry logic
      let answer;
      let attempt = 0;
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds

      while (attempt < maxRetries) {
        try {
          logger.info(`Generating response with Gemini (attempt ${attempt + 1}/${maxRetries})`);
          const result = await this.model.generateContent(prompt);
          answer = result.response.text();
          break; // Success, exit retry loop
        } catch (error) {
          attempt++;
          if (error.message.includes('503') || error.message.includes('overloaded')) {
            if (attempt < maxRetries) {
              const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
              logger.warn(`Gemini API overloaded (attempt ${attempt}). Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              logger.error('All retry attempts failed for Gemini API');
              throw new AppError('Gemini service is temporarily unavailable. Please try again in a few minutes.', 503);
            }
          } else {
            // Non-503 error, don't retry
            throw error;
          }
        }
      }

      // Enhanced metadata with source information
      const sourceInfo = Object.entries(docsBySource).map(([source, docs]) => ({
        document: source,
        chunksUsed: docs.length,
        chunkIndices: docs.map(doc => doc.metadata?.chunkIndex || 0)
      }));

      logger.info(`Query processed successfully. Answer generated from ${sources.length} different documents`);

      return {
        success: true,
        answer: answer,
        sourceDocuments: relevantDocs,
        metadata: {
          question,
          timestamp: new Date().toISOString(),
          sourcesCount: relevantDocs.length,
          documentsUsed: sources.length,
          documentSources: sources,
          sourceBreakdown: sourceInfo,
          totalDocumentsAvailable: this.documents.length
        }
      };
    } catch (error) {
      logger.error('Error processing query:', error);
      throw new AppError(`Failed to process query: ${error.message}`, 500);
    }
  }

  async getStatus() {
    const totalChunks = this.documents.reduce((sum, doc) => sum + doc.chunksCount, 0);

    return {
      isReady: !!this.vectorStore && !!this.retriever,
      documentsCount: this.documents.length,
      totalChunks: totalChunks,
      hasRetriever: !!this.retriever,
      hasModel: !!this.model,
      aiProvider: 'Gemini',
      documents: this.documents.map(doc => ({
        fileName: doc.fileName,
        chunksCount: doc.chunksCount,
        uploadedAt: doc.uploadedAt
      }))
    };
  }

  async getDocuments() {
    return {
      success: true,
      documents: this.documents,
      totalDocuments: this.documents.length,
      totalChunks: this.documents.reduce((sum, doc) => sum + doc.chunksCount, 0)
    };
  }

  async reset() {
    try {
      this.vectorStore = null;
      this.retriever = null;
      this.documents = [];
      logger.info('RAG service reset successfully - all documents cleared');
      return { success: true, message: 'RAG service reset - all documents cleared' };
    } catch (error) {
      logger.error('Error resetting RAG service:', error);
      throw new AppError('Failed to reset RAG service', 500);
    }
  }
}

// Export singleton instance
export default new RAGService();