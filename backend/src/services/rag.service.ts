import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DocumentChunk } from '../models/MongoModels';
import { logger } from '../utils/logger';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Deterministic mock embedding generator for local/no-key usage
const generateMockEmbedding = (text: string): number[] => {
  const embeddingSize = 768;
  const vec = new Array(embeddingSize).fill(0);
  // Hash text to generate a stable, deterministic set of values
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  for (let i = 0; i < embeddingSize; i++) {
    const val = Math.sin(hash + i) * 10000;
    vec[i] = val - Math.floor(val);
  }
  return vec;
};

// Generate high-quality embeddings from Gemini
export const getEmbedding = async (text: string): Promise<number[]> => {
  if (!text || text.trim().length === 0) {
    return new Array(768).fill(0);
  }
  
  if (!genAI) {
    return generateMockEmbedding(text);
  }

  try {
    const embedModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await embedModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    logger.error('Error generating embedding via Gemini, falling back to mock:', error);
    return generateMockEmbedding(text);
  }
};

// Extract text from PDF buffers
export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  try {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  } catch (error) {
    logger.error('Error parsing PDF content:', error);
    throw new Error('Could not parse PDF document');
  }
};

// Chunk text into overlapping regions
export const createChunks = (text: string, chunkSize = 800, overlap = 100): string[] => {
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let index = 0;

  while (index < cleanedText.length) {
    const chunk = cleanedText.substring(index, index + chunkSize);
    chunks.push(chunk);
    index += chunkSize - overlap;
  }

  return chunks;
};

// Process file, generate embeddings, and save to MongoDB
export const processAndStoreDocument = async (
  documentId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<number> => {
  let text = '';
  
  if (mimeType === 'application/pdf') {
    text = await extractTextFromPdf(buffer);
  } else {
    text = buffer.toString('utf-8');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Extracted document text is empty');
  }

  const textChunks = createChunks(text);
  logger.info(`Extracted ${textChunks.length} chunks from document: ${fileName}`);

  // Delete previous chunks for this document if updating
  await DocumentChunk.deleteMany({ documentId });

  // Generate embeddings and store sequentially
  for (let i = 0; i < textChunks.length; i++) {
    const chunkText = textChunks[i];
    const embedding = await getEmbedding(chunkText);
    
    await DocumentChunk.create({
      documentId,
      fileName,
      text: chunkText,
      embedding,
      chunkIndex: i
    });
  }

  return textChunks.length;
};

// Cosine similarity utility
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Perform similarity search
export const searchKnowledgeBase = async (
  query: string,
  limit = 4
): Promise<Array<{ fileName: string; text: string; score: number }>> => {
  const queryEmbedding = await getEmbedding(query);
  
  // Retrieve all chunks from database
  // In production, you would use a native database search or vector database.
  // For portability and consistent operation inside generic Docker containers, we calculate it in-memory.
  const allChunks = await DocumentChunk.find({}, { text: 1, fileName: 1, embedding: 1 });
  
  const results = allChunks.map((chunk) => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      fileName: chunk.fileName,
      text: chunk.text,
      score,
    };
  });

  // Sort by score descending and return top matches
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
