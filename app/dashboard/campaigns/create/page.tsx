'use client'

import { useState} from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Icons } from '@/components/icons'
import { RuleBuilder } from '@/components/campaigns/rule-builder'
import { AudiencePreview } from '@/components/campaigns/audience-preview'
import { AiMessageGenerator } from '@/components/campaigns/ai-message-generator'
import { SegmentRule } from '@/types'
import { toast } from 'sonner'

interface AudienceData {
  audienceSize: number
  description: string
  sampleCustomers: unknown[]
}

export default function CreateCampaignPage() {
  const router = useRouter()
  
  const [campaignName, setCampaignName] = useState('')
  const [rules, setRules] = useState<SegmentRule[]>([])
  const [message, setMessage] = useState('')
  const [audienceData, setAudienceData] = useState<AudienceData | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const previewAudience = async () => {
    setIsPreviewLoading(true)
    try {
      const response = await fetch('/api/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      })

      const result = await response.json()

      if (result.success) {
        setAudienceData(result.data)
      } else {
        throw new Error(result.message)
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to preview audience";
      if (error && typeof error === "object" && "message" in error && typeof (error).message === "string") {
        errorMessage = (error as { message: string }).message;
      }
      toast.error("Preview failed",{
        description: errorMessage,
      })
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const createCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error("Campaign name required",{
        description: "Please enter a name for your campaign",
      })
      return
    }

    if (!message.trim()) {
      toast.error("Message required",{
        description: "Please enter a message for your campaign",
      })
      return
    }

    if (!audienceData || audienceData.audienceSize === 0) {
      toast.error("No audience selected",{
        description: "Please preview your audience before creating the campaign",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          rules,
          message,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Campaign created! 🎉",{        
          description: `Your campaign "${campaignName}" has been created and delivery is starting`,
        })
    } }catch (error: unknown) {
      let errorMessage = "Failed to create campaign";
      if (error && typeof error === "object" && "message" in error && typeof (error).message === "string") {
        errorMessage = (error as { message: string }).message;
      }
      toast.error("Campaign creation failed",{
        description: errorMessage,
      })
    } finally {
      setIsCreating(false)
    }
  }

  const steps = [
    { number: 1, title: 'Define Audience', icon: Icons.users },
    { number: 2, title: 'Create Message', icon: Icons.message },
    { number: 3, title: 'Review & Launch', icon: Icons.zap },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/campaigns')}
            className="p-2"
          >
            <Icons.chevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create New Campaign
            </h1>
            <p className="text-gray-600 mt-1">Build targeted campaigns with AI-powered insights</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep >= step.number
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <Icons.eye className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.number ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 ml-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.settings className="h-5 w-5" />
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  placeholder="Enter campaign name..."
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Rule Builder */}
          <RuleBuilder
            rules={rules}
            onChange={setRules}
            onPreview={previewAudience}
            isPreviewLoading={isPreviewLoading}
          />

          {/* Message Generator */}
          {audienceData && (
            <AiMessageGenerator
              audienceDescription={audienceData.description}
              onMessageSelect={setMessage}
              selectedMessage={message}
            />
          )}

          {/* Manual Message Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.message className="h-5 w-5" />
                Campaign Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="message">Message Content</Label>
                <Textarea
                  id="message"
                  placeholder="Hi {customerName}, here's a special offer just for you!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Use {'{customerName}'} for personalization</span>
                  <span>{message.length}/500 characters</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          {/* Audience Preview */}
          {audienceData ? (
            <AudiencePreview
              audienceSize={audienceData.audienceSize}
              description={audienceData.description}
              sampleCustomers={audienceData.sampleCustomers}
              isLoading={isPreviewLoading}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.users className="h-5 w-5" />
                  Audience Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Icons.target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>Define your audience rules and click preview to see who will receive your campaign</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign Summary */}
          {audienceData && message && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Icons.eye className="h-5 w-5" />
                  Campaign Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-green-700">Campaign Name:</span>
                  <p className="text-sm text-green-600">{campaignName || 'Untitled Campaign'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-green-700">Target Audience:</span>
                  <p className="text-sm text-green-600">{audienceData.audienceSize.toLocaleString()} customers</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-green-700">Message Preview:</span>
                  <p className="text-sm text-green-600 bg-white p-2 rounded border">
                    {message.replace('{customerName}', 'John Doe')}
                  </p>
                </div>
                <Button
                  onClick={createCampaign}
                  disabled={isCreating || !campaignName || !message}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isCreating ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Creating Campaign...
                    </>
                  ) : (
                    <>
                      <Icons.zap className="mr-2 h-4 w-4" />
                      Launch Campaign
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}