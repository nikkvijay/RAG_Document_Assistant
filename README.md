# RAG Document Assistant

An intelligent document assistant powered by AI that allows users to upload PDF documents and ask questions about their content using natural language. Built with Angular, Node.js, and Google's Gemini AI.

![RAG Document Assistant](https://img.shields.io/badge/RAG-Document%20Assistant-blue?style=for-the-badge)
![Angular](https://img.shields.io/badge/Angular-20-red?style=flat-square&logo=angular)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Powered-orange?style=flat-square)

## ✨ Features

- **📄 Smart PDF Processing**: Upload and process PDF documents with intelligent chunking
- **🤖 AI-Powered Q&A**: Ask natural language questions about your documents
- **🔄 Document Management**: Replace or append documents with flexible modes
- **⚡ Real-time Processing**: Instant document analysis and embedding generation
- **🎯 Source Attribution**: Get answers with references to specific document sections
- **🌐 Modern UI**: Clean, responsive interface built with Angular 20
- **🔍 Vector Search**: Efficient semantic search using advanced embeddings
- **📊 Multi-Document Support**: Query across multiple documents simultaneously

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Angular 20    │    │    Node.js      │    │   Gemini AI     │
│   Frontend      │◄──►│    Backend      │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • Document UI   │    │ • RAG Service   │    │ • Embeddings    │
│ • Chat Interface│    │ • PDF Processing│    │ • Text Gen      │
│ • File Upload   │    │ • Vector Store  │    │ • Summarization │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Angular CLI
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/RAG_Document_Assistant.git
   cd RAG_Document_Assistant
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Add your Gemini API key to .env
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ng serve
   ```

4. **Access the Application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:5000/api

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the backend directory:

```env
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Document Processing
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### Frontend Environment

Update `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  appName: 'RAG Document Assistant'
};
```

## 📖 Usage

### 1. Upload Documents
- Click "Choose PDF Files" or drag and drop PDF files
- Documents are automatically processed and embedded
- View uploaded documents in the status panel

### 2. Ask Questions
- Type your question in the chat interface
- Get AI-powered answers based on document content
- See source references and relevant document chunks

### 3. Document Modes
- **Replace Mode** (default): New uploads replace existing documents
- **Append Mode**: Add to existing document collection

## 🛠️ Technical Stack

### Frontend
- **Framework**: Angular 20
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Angular Signals
- **HTTP Client**: Angular HTTP Client

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript (ES6 modules)
- **AI Integration**: Google Generative AI
- **Document Processing**: LangChain
- **Vector Store**: Memory Vector Store
- **File Upload**: Multer

### AI & ML
- **LLM**: Google Gemini 1.5 Flash
- **Embeddings**: Google text-embedding-004
- **Text Processing**: LangChain TextSplitters
- **PDF Loading**: LangChain PDF Loader

## 📁 Project Structure

```
RAG_Document_Assistant/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   ├── middleware/       # Express middleware
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic (RAG service)
│   │   └── utils/           # Utility functions
│   ├── uploads/             # Uploaded PDF files
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # Angular components
│   │   │   ├── services/    # Angular services
│   │   │   └── models/      # TypeScript interfaces
│   │   └── environments/    # Environment configs
│   ├── package.json
│   └── angular.json
└── README.md
```

## 🔧 API Endpoints

### Document Management
- `POST /api/documents/upload` - Upload and process PDF documents
- `GET /api/documents` - Get list of uploaded documents
- `GET /api/documents/status` - Get system status
- `POST /api/documents/reset` - Clear all documents

### Chat & Query
- `POST /api/chat/query` - Ask questions about documents

### Health Check
- `GET /api/health` - System health status

## 🎯 Key Features Explained

### RAG (Retrieval-Augmented Generation)
1. **Document Processing**: PDFs are loaded and split into semantic chunks
2. **Embedding Generation**: Text chunks are converted to vector embeddings
3. **Vector Storage**: Embeddings stored in memory for fast retrieval
4. **Semantic Search**: User queries are matched against document chunks
5. **Context-Aware Responses**: AI generates answers using retrieved context

### Smart Document Handling
- **Automatic Chunking**: Documents split into optimal-sized pieces
- **Metadata Preservation**: Source tracking for proper attribution
- **Flexible Modes**: Replace or append document strategies
- **Error Handling**: Comprehensive error management and logging

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
ng test
```

## 📊 Performance Considerations

- **Memory Usage**: Uses in-memory vector store (suitable for development)
- **File Size Limit**: 10MB per PDF file
- **Concurrent Users**: Single-instance deployment
- **Response Time**: ~2-5 seconds for complex queries

## 🚀 Deployment

### Development
```bash
# Backend
npm run dev

# Frontend
ng serve
```

### Production
```bash
# Backend
npm run build
npm start

# Frontend
ng build --prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) for document processing capabilities
- [Google Gemini AI](https://ai.google.dev/) for powerful language understanding
- [Angular](https://angular.io/) for the robust frontend framework
- [Node.js](https://nodejs.org/) for the efficient backend runtime

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the documentation
- Review the API endpoints

## 🔮 Roadmap

- [ ] Persistent vector storage (PostgreSQL with pgvector)
- [ ] Multi-user authentication
- [ ] Document versioning
- [ ] Advanced search filters
- [ ] Export conversation history
- [ ] Support for more file formats (Word, Excel, etc.)
- [ ] Docker containerization
- [ ] Cloud deployment guides

---



*Empowering document intelligence through AI*