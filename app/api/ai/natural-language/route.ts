import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { geminiService } from '@/lib/ai/gemini'
import { z } from 'zod'

const nlSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
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
    const { query } = nlSchema.parse(body)

    const rules = await geminiService.naturalLanguageToRules(query)

    return NextResponse.json({
      success: true,
      data: {
        query,
        rules,
      },
    })
  } catch (error: any) {
    console.error('Natural Language API Error:', error)

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to convert natural language to rules',
      },
      { status: 500 }
    )
  }
}