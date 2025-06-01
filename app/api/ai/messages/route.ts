import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { geminiService } from '@/lib/ai/gemini'
import { z } from 'zod'

const messageSchema = z.object({
  objective: z.string().min(1, 'Objective is required'),
  audienceDescription: z.string().min(1, 'Audience description is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { objective, audienceDescription } = messageSchema.parse(body)

    const messages = await geminiService.generateCampaignMessages(objective, audienceDescription)

    return NextResponse.json({
      success: true,
      data: {
        messages,
        objective,
        audienceDescription,
      },
    })
  } catch (error: any) {
    console.error('Message Generation API Error:', error)

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to generate messages',
      },
      { status: 500 }
    )
  }
}