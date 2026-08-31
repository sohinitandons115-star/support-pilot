import React from 'react';
import Link from 'next/link';

/**
 * System & Integration Concept: Server-Side Rendering (SSR)
 * 
 * Demonstrates Next.js App Router Server Components:
 * 1. Data is pre-fetched and HTML is rendered completely on the SERVER before sending to the client browser.
 * 2. Improves SEO, initial page load speed, and reduces client-side JS bundle overhead.
 */

interface PlatformMetrics {
  totalTickets: number;
  activeUsers: number;
  ragDocuments: number;
  serverTimestamp: string;
}

// Async Server Component (Runs on Server Node.js runtime)
export default async function SSRDemoPage() {
  // Pre-render data on the server
  const serverRenderTime = new Date().toISOString();

  // Simulated server fetch
  const metrics: PlatformMetrics = {
    totalTickets: 1284,
    activeUsers: 452,
    ragDocuments: 98,
    serverTimestamp: serverRenderTime
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-semibold">
              Server-Side Rendered (SSR)
            </span>
            <h1 className="text-3xl font-bold mt-2">SupportPilot SSR Performance Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              This page was generated on the server using Next.js App Router Server Components.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700"
          >
            ← Back to Main App
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-xl">
            <p className="text-xs text-slate-400 uppercase font-semibold">Total Support Tickets</p>
            <p className="text-3xl font-bold text-indigo-400 mt-2">{metrics.totalTickets}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-xl">
            <p className="text-xs text-slate-400 uppercase font-semibold">Active Support Users</p>
            <p className="text-3xl font-bold text-emerald-400 mt-2">{metrics.activeUsers}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-xl">
            <p className="text-xs text-slate-400 uppercase font-semibold">Ingested RAG Chunks</p>
            <p className="text-3xl font-bold text-amber-400 mt-2">{metrics.ragDocuments}</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/60 p-6 rounded-xl space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">How SSR Works in Next.js App Router</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
            <li>
              <strong>Zero Client JS for Render:</strong> The HTML structure above was completely evaluated on the server.
            </li>
            <li>
              <strong>Server Timestamp:</strong> <code className="bg-slate-950 px-2 py-0.5 rounded text-emerald-300">{metrics.serverTimestamp}</code>
            </li>
            <li>
              <strong>SEO & Speed:</strong> Web crawlers and users receive fully rendered content immediately without waiting for client-side API hydration roundtrips.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
