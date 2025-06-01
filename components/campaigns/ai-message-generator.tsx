'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { toast } from 'sonner'

interface AiMessageGeneratorProps {
  audienceDescription: string
  onMessageSelect: (message: string) => void
  selectedMessage?: string
}

export function AiMessageGenerator({ 
  audienceDescription, 
  onMessageSelect, 
  selectedMessage 
}: AiMessageGeneratorProps) {
  const [objective, setObjective] = useState('')
  const [generatedMessages, setGeneratedMessages] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateMessages = async () => {
    if (!objective.trim()) {
      toast.error( "Please enter a campaign objective",{
        description: "Describe what you want to achieve with this campaign",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          audienceDescription,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setGeneratedMessages(result.data.messages)
        toast.success("Messages generated! ✨",{
          description: "AI has created personalized message variants for your campaign",
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to generate AI messages";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error("Message generation failed",{
        description: errorMessage,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const getMessageTone = (message: string, index: number): string => {
    const tones = ['Urgent', 'Friendly', 'Exclusive']
    return tones[index % tones.length]
  }

  const getMessageIcon = (tone: string) => {
    switch (tone) {
      case 'Urgent': return <Icons.zap className="h-4 w-4 text-red-500" />
      case 'Friendly': return <Icons.users className="h-4 w-4 text-green-500" />
      case 'Exclusive': return <Icons.target className="h-4 w-4 text-purple-500" />
      default: return <Icons.message className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.zap className="h-5 w-5" />
          AI Message Generator
          <Badge variant="secondary" className="text-xs">Gemini 2.0</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="objective">Campaign Objective</Label>
            <Input
              id="objective"
              placeholder="e.g., 'bring back inactive users', 'promote new product', 'reward loyal customers'"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Target Audience</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded text-sm text-gray-600">
              {audienceDescription || 'No audience selected'}
            </div>
          </div>

          <Button
            onClick={generateMessages}
            disabled={isGenerating || !objective.trim() || !audienceDescription}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isGenerating ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Icons.zap className="mr-2 h-4 w-4" />
                Generate Messages
              </>
            )}
          </Button>
        </div>

        {generatedMessages.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Generated Message Variants</h4>
            {generatedMessages.map((message, index) => {
              const tone = getMessageTone(message, index)
              const isSelected = selectedMessage === message
              
              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => onMessageSelect(message)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getMessageIcon(tone)}
                      <Badge variant="outline" className="text-xs">
                        {tone} Tone
                      </Badge>
                    </div>
                    {isSelected && (
                      <Icons.eye className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{message}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    {message.length} characters
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Icons.eye className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Selected Message</span>
            </div>
            <p className="text-sm text-green-800">{selectedMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}