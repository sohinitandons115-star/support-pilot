import mongoose, { Schema, Document } from 'mongoose';

/**
 * NoSQL (MongoDB) Modeling Concept: Embedding vs Referencing Relationships
 * 
 * 1. EMBEDDING (Denormalization):
 *    - Embedded Subdocuments: `messages` sub-array embedded inside `ConversationSchema`, `details` embedded in `EvaluationResultSchema`.
 *    - Use Case: Highly cohesive sub-data that is always read and updated alongside the parent entity (eliminates join overhead for fast single-read performance).
 * 
 * 2. REFERENCING (Normalization):
 *    - Referenced Identifiers: `userId` referencing PostgreSQL User ID, `conversationId` linking AgentRuns to Conversations.
 *    - Use Case: Cross-collection relations where child entities grow unbounded or require independent querying and aggregation.
 */

// 1. Conversation Schema (Demonstrates EMBEDDED Messages)
export interface IMessage {
  role: 'user' | 'model' | 'system' | 'tool';
  content: string;
  name?: string; // For tool responses
  timestamp: Date;
}

export interface IConversation extends Document {
  userId: string; // REFERENCED: Foreign Key pointing to PostgreSQL User table
  messages: IMessage[]; // EMBEDDED: Subdocuments stored directly inside conversation document
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, required: true, enum: ['user', 'model', 'system', 'tool'] },
  content: { type: String, required: true },
  name: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const ConversationSchema = new Schema<IConversation>({
  userId: { type: String, required: true, index: true },
  messages: [MessageSchema] // Embedded subdocument schema array
}, { timestamps: true });

ConversationSchema.index({ createdAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

// 2. AgentRun Schema (AI Analytics & Metrics)
export interface IAgentRun extends Document {
  conversationId: string;
  userId: string;
  model: string;
  requestType: string; // e.g. "chat", "rag", "eval"
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latency: number; // in milliseconds
  toolsUsed: string[];
  success: boolean;
  timestamp: Date;
}

const AgentRunSchema = new Schema<IAgentRun>({
  conversationId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  model: { type: String, required: true },
  requestType: { type: String, required: true },
  inputTokens: { type: Number, required: true },
  outputTokens: { type: Number, required: true },
  totalTokens: { type: Number, required: true },
  estimatedCost: { type: Number, required: true },
  latency: { type: Number, required: true },
  toolsUsed: [{ type: String }],
  success: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const AgentRun = mongoose.model<IAgentRun>('AgentRun', AgentRunSchema);

// 3. ToolExecution Schema
export interface IToolExecution extends Document {
  runId: string;
  toolName: string;
  arguments: Record<string, any>;
  response: string;
  success: boolean;
  timestamp: Date;
}

const ToolExecutionSchema = new Schema<IToolExecution>({
  runId: { type: String, required: true, index: true },
  toolName: { type: String, required: true, index: true },
  arguments: { type: Schema.Types.Mixed, required: true },
  response: { type: String, required: true },
  success: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const ToolExecution = mongoose.model<IToolExecution>('ToolExecution', ToolExecutionSchema);

// 4. DocumentChunk Schema (RAG Vector Chunks)
export interface IDocumentChunk extends Document {
  documentId: string; // UUID of document
  fileName: string;
  text: string;
  embedding: number[];
  chunkIndex: number;
  createdAt: Date;
}

const DocumentChunkSchema = new Schema<IDocumentChunk>({
  documentId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }, // Store high-dimensional vectors
  chunkIndex: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const DocumentChunk = mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema);

// 5. EvaluationResult Schema
export interface IEvalCaseResult {
  name: string;
  query: string;
  expectedBehavior: string;
  actualResponse: string;
  toolsTriggered: string[];
  passed: boolean;
  reason: string;
}

export interface IEvaluationResult extends Document {
  runId: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  accuracy: number;
  details: IEvalCaseResult[];
  createdAt: Date;
}

const EvalCaseResultSchema = new Schema<IEvalCaseResult>({
  name: { type: String, required: true },
  query: { type: String, required: true },
  expectedBehavior: { type: String, required: true },
  actualResponse: { type: String, required: true },
  toolsTriggered: [{ type: String }],
  passed: { type: Boolean, required: true },
  reason: { type: String, required: true }
});

const EvaluationResultSchema = new Schema<IEvaluationResult>({
  runId: { type: String, required: true, unique: true },
  totalCases: { type: Number, required: true },
  passedCases: { type: Number, required: true },
  failedCases: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  details: [EvalCaseResultSchema]
}, { timestamps: true });

export const EvaluationResult = mongoose.model<IEvaluationResult>('EvaluationResult', EvaluationResultSchema);
