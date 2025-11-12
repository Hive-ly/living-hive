import React, { useState } from 'react'
import { toast } from 'sonner'
import { LivingHive } from '@living-hive/react'
import type { BaseStory } from '@living-hive/react'

const sampleStories: BaseStory[] = [
  {
    id: '1',
    text: 'I had a great experience working with my team today. We collaborated effectively and achieved our goals.',
  },
  {
    id: '2',
    text: 'The project deadline was moved up unexpectedly, which caused some stress among team members.',
  },
]

export function ServerSideExample() {
  const [apiEndpoint, setApiEndpoint] = useState('')

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Server-Side Example</h2>
      <p className="text-gray-600 mb-4">
        This example shows how to use the Living Hive with a server-side API endpoint.
        Configure your server endpoint below:
      </p>
      <input
        type="text"
        value={apiEndpoint}
        onChange={e => setApiEndpoint(e.target.value)}
        placeholder="https://your-api.com/embeddings"
        className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
      />
      {apiEndpoint && (
        <LivingHive
          stories={sampleStories}
          openaiApiKey="" // Not used when apiEndpoint is provided
          apiEndpoint={apiEndpoint}
          onError={error => {
            console.error('Error:', error)
            toast.error('Failed to process stories', {
              description: error.message,
              duration: 5000,
            })
          }}
        />
      )}
    </div>
  )
}

