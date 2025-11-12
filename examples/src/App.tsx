import React, { useState } from 'react'
import { BasicExample } from './examples/BasicExample'
import { WithThemesExample } from './examples/WithThemesExample'
import { ServerSideExample } from './examples/ServerSideExample'
import { Toaster } from './components/ui/sonner'

function App() {
  const [activeExample, setActiveExample] = useState<'basic' | 'themes' | 'server'>('basic')

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Living Hive Examples
        </h1>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveExample('basic')}
            className={`px-4 py-2 rounded ${
              activeExample === 'basic'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Basic Example
          </button>
          <button
            onClick={() => setActiveExample('themes')}
            className={`px-4 py-2 rounded ${
              activeExample === 'themes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            With Themes
          </button>
          <button
            onClick={() => setActiveExample('server')}
            className={`px-4 py-2 rounded ${
              activeExample === 'server'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Server-Side
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeExample === 'basic' && <BasicExample />}
          {activeExample === 'themes' && <WithThemesExample />}
          {activeExample === 'server' && <ServerSideExample />}
        </div>
      </div>
    </div>
    </>
  )
}

export default App

