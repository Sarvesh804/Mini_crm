'use client'

import { useState} from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { SegmentRule } from '@/types'

interface RuleBuilderProps {
  rules: SegmentRule[]
  onChange: (rules: SegmentRule[]) => void
  onPreview: () => void
  isPreviewLoading?: boolean
}

const FIELDS = [
  { value: 'totalSpent', label: 'Total Spent', type: 'number' },
  { value: 'visits', label: 'Number of Visits', type: 'number' },
  { value: 'lastVisit', label: 'Last Visit', type: 'date' },
  { value: 'createdAt', label: 'Registration Date', type: 'date' },
]

const OPERATORS = {
  number: [
    { value: '>', label: 'Greater than' },
    { value: '<', label: 'Less than' },
    { value: '>=', label: 'Greater than or equal' },
    { value: '<=', label: 'Less than or equal' },
    { value: '=', label: 'Equal to' },
    { value: '!=', label: 'Not equal to' },
  ],
  date: [
    { value: '>', label: 'After' },
    { value: '<', label: 'Before' },
    { value: 'days_ago', label: 'Days ago' },
  ],
}

export function RuleBuilder({ rules, onChange, onPreview, isPreviewLoading }: RuleBuilderProps) {
  const [nlQuery, setNlQuery] = useState('')
  const [isNlLoading, setIsNlLoading] = useState(false)

  const addRule = () => {
    const newRule: SegmentRule = {
      field: 'totalSpent',
      operator: '>',
      value: 0,
      logic: rules.length > 0 ? 'AND' : undefined,
    }
    onChange([...rules, newRule])
  }

  const updateRule = (index: number, updates: Partial<SegmentRule>) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], ...updates }
    onChange(newRules)
  }

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index)
    onChange(newRules)
  }

  const convertNaturalLanguage = async () => {
    if (!nlQuery.trim()) {
      toast.error("Please enter a query",{    
        description: "Describe your target audience in natural language",
      })
      return
    }

    setIsNlLoading(true)
    try {
      const response = await fetch('/api/ai/natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlQuery }),
      })

      const result = await response.json()

      if (result.success) {
        onChange(result.data.rules)
        setNlQuery('')
        toast.success("Rules generated! 🎉",{ 
          description: "Your natural language query has been converted to rules",
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error: unknown) {
      let message = "Failed to convert natural language to rules";
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error("AI conversion failed",{
        description: message,
      })
    } finally {
      setIsNlLoading(false)
    }
  }

  const getFieldType = (field: string): string => {
    return FIELDS.find(f => f.value === field)?.type || 'number'
  }

  const getAvailableOperators = (fieldType: string) => {
    return OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.number
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.target className="h-5 w-5" />
          Audience Segmentation Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Natural Language Input */}
        <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Icons.zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">AI-Powered Rule Builder</span>
            <Badge variant="secondary" className="text-xs">Gemini 2.0</Badge>
          </div>
          <Textarea
            placeholder="Describe your target audience in natural language, e.g., 'customers who spent more than $500 and haven't visited in 30 days'"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            className="min-h-[80px]"
          />
          <Button
            onClick={convertNaturalLanguage}
            disabled={isNlLoading || !nlQuery.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isNlLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Converting with AI...
              </>
            ) : (
              <>
                <Icons.zap className="mr-2 h-4 w-4" />
                Convert to Rules
              </>
            )}
          </Button>
        </div>

        {/* Manual Rule Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Manual Rule Builder</h3>
            <Button onClick={addRule} variant="outline" size="sm">
              <Icons.add className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Icons.target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No rules defined. Add a rule or use AI to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-3 p-4 border rounded-lg bg-white">
                  {index > 0 && (
                    <Select
                      value={rule.logic}
                      onValueChange={(value) => updateRule(index, { logic: value as 'AND' | 'OR' })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Select
                    value={rule.field}
                    onValueChange={(value) => updateRule(index, { field: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELDS.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={rule.operator}
                    onValueChange={(value) => updateRule(index, { operator: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableOperators(getFieldType(rule.field)).map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type={getFieldType(rule.field) === 'date' ? 'number' : getFieldType(rule.field)}
                    value={rule.value}
                    onChange={(e) => updateRule(index, { 
                      value: getFieldType(rule.field) === 'number' ? Number(e.target.value) : e.target.value 
                    })}
                    placeholder={getFieldType(rule.field) === 'date' ? 'Days' : 'Value'}
                    className="w-32"
                  />

                  <Button
                    onClick={() => removeRule(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Icons.add className="h-4 w-4 rotate-45" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Button */}
        <Button
          onClick={onPreview}
          disabled={isPreviewLoading}
          className="w-full"
          variant="outline"
        >
          {isPreviewLoading ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Calculating audience...
            </>
          ) : (
            <>
              <Icons.eye className="mr-2 h-4 w-4" />
              Preview Audience
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}