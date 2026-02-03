'use client';

import { useState, useEffect } from 'react';

export default function LlmApiPage() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [testPrompt, setTestPrompt] = useState('Hello, what is 2 + 2?');
  const [testResponse, setTestResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if hazo_llm_api is configured
  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch('/api/llm/status');
        const data = await res.json();
        setIsConfigured(data.configured);
      } catch {
        setIsConfigured(false);
      }
    }
    checkConfig();
  }, []);

  const handleTestApi = async () => {
    setIsLoading(true);
    setError(null);
    setTestResponse('');

    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testPrompt }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResponse(data.response);
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LLM API</h1>
        <p className="text-gray-500 mt-1">
          Configure and test the hazo_llm_api integration
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            API Status
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Current configuration status for hazo_llm_api
          </p>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            {isConfigured === null ? (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                Checking...
              </span>
            ) : isConfigured ? (
              <>
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-700">
                  hazo_llm_api is configured and ready
                </span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-yellow-700">
                  hazo_llm_api is not configured. Set your API credentials in the environment.
                </span>
              </>
            )}
          </div>

          {!isConfigured && isConfigured !== null && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Required environment variables:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><code className="bg-white px-1 rounded border">HAZO_LLM_PROVIDER</code> - Provider (gemini, qwen, openai, anthropic)</li>
                <li><code className="bg-white px-1 rounded border">GEMINI_API_KEY</code> - For Gemini provider</li>
                <li><code className="bg-white px-1 rounded border">QWEN_API_KEY</code> - For Qwen provider</li>
                <li><code className="bg-white px-1 rounded border">OPENAI_API_KEY</code> - For OpenAI provider</li>
                <li><code className="bg-white px-1 rounded border">ANTHROPIC_API_KEY</code> - For Anthropic provider</li>
                <li><code className="bg-white px-1 rounded border">HAZO_LLM_MODEL</code> - Model name (optional)</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Test Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Test API</h2>
          <p className="text-sm text-gray-500 mt-1">
            Send a test prompt to verify the LLM API is working
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="test-prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Test Prompt
            </label>
            <textarea
              id="test-prompt"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a test prompt..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleTestApi}
            disabled={isLoading || !isConfigured || !testPrompt.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {isLoading ? 'Sending...' : 'Send Test'}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {testResponse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Response</label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm whitespace-pre-wrap">{testResponse}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">About hazo_llm_api</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600">
            hazo_llm_api is a unified interface for working with various LLM providers.
            It supports OpenAI, Anthropic, and other providers through a consistent API.
            Configure it to enable LLM-powered features like content extraction,
            document analysis, and intelligent file processing.
          </p>
        </div>
      </div>
    </div>
  );
}
