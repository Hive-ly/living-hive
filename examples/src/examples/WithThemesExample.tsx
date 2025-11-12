import React from 'react'
import { toast } from 'sonner'
import { LivingHive } from '@living-hive/react'
import type { BaseStory, Theme } from '@living-hive/react'

const sampleStories: BaseStory[] = [
  {
    id: '1',
    text: 'I had a great experience working with my team today. We collaborated effectively and achieved our goals.',
  },
  {
    id: '2',
    text: 'The project deadline was moved up unexpectedly, which caused some stress among team members.',
  },
  {
    id: '3',
    text: 'Our manager provided clear feedback during the performance review, which helped me understand areas for improvement.',
  },
  {
    id: '4',
    text: 'There was a miscommunication about the meeting time, leading to confusion and delays.',
  },
]

const predefinedThemes: Theme[] = [
  { id: 'collaboration', label: 'Team Collaboration' },
  { id: 'stress', label: 'Work Stress' },
  { id: 'feedback', label: 'Performance Feedback' },
  { id: 'communication', label: 'Communication Issues' },
]

export function WithThemesExample() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">With Themes Example</h2>
        <p className="text-gray-600 mb-4">
          Please set VITE_OPENAI_API_KEY in your .env.local file to see the visualization.
        </p>
        <p className="text-sm text-gray-500">
          Create a .env.local file in the root directory with: VITE_OPENAI_API_KEY=sk-your-key-here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">With Themes Example</h2>
      <p className="text-gray-600 mb-4">
        This example shows the Living Hive visualization with predefined themes.
      </p>
      <LivingHive
        stories={sampleStories}
        openaiApiKey={apiKey}
        themes={predefinedThemes}
        onError={error => {
          console.error('Error:', error)
          toast.error('Failed to process stories', {
            description: error.message,
            duration: 5000,
          })
        }}
      />
    </div>
  )
}

