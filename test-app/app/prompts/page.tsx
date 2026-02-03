'use client';

import { PromptEditor, create_rest_api_connect } from 'hazo_llm_api';

// Create the REST API connect instance
const connect = create_rest_api_connect('/api/prompts');

export default function PromptsPage() {
  return (
    <div className="h-full">
      <PromptEditor
        connect={connect}
        customization={{
          title: 'Prompt Configuration',
          description: 'Manage LLM prompts for use with hazo_llm_api',
          empty_message: 'No prompts found. Click "Add Prompt" to create one.',
        }}
        callbacks={{
          on_create: (prompt) => console.log('Created prompt:', prompt.id),
          on_update: (prompt) => console.log('Updated prompt:', prompt.id),
          on_delete: (id) => console.log('Deleted prompt:', id),
          on_error: (error) => console.error('Prompt error:', error),
        }}
      />
    </div>
  );
}
