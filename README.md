# NodeLearn

An interactive learning visualization tool that helps users explore and understand complex topics through dynamic knowledge trees. Built with Next.js, TypeScript, and ReactFlow, NodeLearn transforms learning into an engaging visual experience.

## 🚀 Features

- Interactive knowledge tree visualization
- Dynamic node generation and exploration
- Real-time topic exploration with AI integration
- Beautiful and responsive UI with smooth animations
- History tracking of learning sessions
- Collision-free node layout algorithm
- Customizable node styling and interactions
- Search functionality across learning history
- MongoDB integration for persistent storage
- Google Generative AI for intelligent topic exploration

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Data Visualization**: ReactFlow
- **Database**: MongoDB
- **AI**: Google Generative AI
- **Animation**: Framer Motion

## 📦 Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- MongoDB (if using local database)
- Google AI API key (for topic exploration)
- GROQ API key (for AI-powered topic exploration)

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd NodeLearn
   ```

2. Install dependencies:
   ```bash
   cd client
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the client directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   GOOGLE_API_KEY=your_google_ai_api_key
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to start exploring topics.

## 📁 Project Structure

```
client/
├── app/              # Next.js app directory
├── components/       # Reusable UI components
│   ├── zoom-slider/ # Custom zoom control component
│   └── ...          # Other UI components
├── lib/             # Utility functions and configurations
├── models/          # Data models for MongoDB
├── public/          # Static assets
└── functions/       # Serverless functions
```

## 🎯 How It Works

1. **Topic Input**: Enter any topic you want to explore
2. **Tree Generation**: The system generates a root node with the main topic
3. **Interactive Exploration**: Click on nodes to generate related subtopics
4. **Visual Learning**: Navigate through the knowledge tree to understand relationships
5. **History Tracking**: Save and revisit your learning sessions

## 🛠️ Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.