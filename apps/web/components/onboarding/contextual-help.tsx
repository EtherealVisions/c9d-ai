'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  HelpCircle, 
  MessageCircle, 
  BookOpen, 
  Lightbulb, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageSquare,
  X,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingStep } from '@/lib/models/onboarding-types'

export interface ContextualHelpProps {
  step: OnboardingStep
  isVisible: boolean
  onClose: () => void
  onEscalateSupport: () => void
  className?: string
}

interface HelpTopic {
  id: string
  title: string
  content: string
  type: 'tip' | 'warning' | 'info' | 'example'
  isExpanded?: boolean
}

interface SupportOption {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  availability?: string
}

export function ContextualHelp({
  step,
  isVisible,
  onClose,
  onEscalateSupport,
  className
}: ContextualHelpProps) {
  const [activeTab, setActiveTab] = useState('help')
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Extract help content from step metadata
  const helpContent = step.metadata?.help as Record<string, unknown> || {}
  const tips = (helpContent.tips as HelpTopic[]) || []
  const examples = (helpContent.examples as HelpTopic[]) || []
  const resources = (helpContent.resources as Array<{ title: string; url: string; type: string }>) || []

  // Default help topics based on step type
  const getDefaultHelpTopics = (): HelpTopic[] => {
    const baseTopics: HelpTopic[] = []

    switch (step.step_type) {
      case 'tutorial':
        baseTopics.push({
          id: 'tutorial-navigation',
          title: 'Navigating the Tutorial',
          content: 'Use the tabs to switch between content, practice, and validation. Take your time to read through each section.',
          type: 'tip'
        })
        break

      case 'exercise':
        baseTopics.push({
          id: 'exercise-completion',
          title: 'Completing Exercises',
          content: 'Fill out all required fields and ensure your answers meet the validation criteria. You can see your progress in the validation tab.',
          type: 'info'
        })
        break

      case 'setup':
        baseTopics.push({
          id: 'setup-requirements',
          title: 'Setup Requirements',
          content: 'Make sure you have all necessary permissions and access before starting the setup process.',
          type: 'warning'
        })
        break

      case 'validation':
        baseTopics.push({
          id: 'validation-criteria',
          title: 'Validation Criteria',
          content: 'Your work will be automatically validated against the success criteria. Check the validation tab for real-time feedback.',
          type: 'info'
        })
        break
    }

    // Add common topics
    baseTopics.push({
      id: 'getting-stuck',
      title: 'What if I get stuck?',
      content: 'Don\'t worry! You can pause the step, reset if needed, or contact support for help. There\'s no penalty for taking your time.',
      type: 'tip'
    })

    return baseTopics
  }

  const allHelpTopics = [...getDefaultHelpTopics(), ...tips, ...examples]

  // Filter topics based on search
  const filteredTopics = allHelpTopics.filter(topic =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Support options
  const supportOptions: SupportOption[] = [
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      icon: MessageSquare,
      action: onEscalateSupport,
      availability: 'Available 24/7'
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'Send us a detailed message',
      icon: Mail,
      action: () => {
        window.open('mailto:support@c9d.ai?subject=Onboarding Help&body=I need help with: ' + step.title)
      },
      availability: 'Response within 2 hours'
    },
    {
      id: 'phone',
      title: 'Phone Support',
      description: 'Speak directly with a specialist',
      icon: Phone,
      action: () => {
        window.open('tel:+1-800-C9D-HELP')
      },
      availability: 'Mon-Fri 9AM-6PM EST'
    }
  ]

  // Toggle topic expansion
  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId)
    } else {
      newExpanded.add(topicId)
    }
    setExpandedTopics(newExpanded)
  }

  // Get topic icon and color
  const getTopicStyle = (type: HelpTopic['type']) => {
    switch (type) {
      case 'tip':
        return { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-50' }
      case 'warning':
        return { icon: HelpCircle, color: 'text-orange-500', bg: 'bg-orange-50' }
      case 'info':
        return { icon: BookOpen, color: 'text-green-500', bg: 'bg-green-50' }
      case 'example':
        return { icon: MessageCircle, color: 'text-purple-500', bg: 'bg-purple-50' }
      default:
        return { icon: HelpCircle, color: 'text-gray-500', bg: 'bg-gray-50' }
    }
  }

  if (!isVisible) return null

  return (
    <Card className={cn("w-full h-fit sticky top-4", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <HelpCircle className="h-5 w-5" />
            <span>Help & Support</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="help">Help</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          <TabsContent value="help" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-md"
              />
            </div>

            {/* Help topics */}
            <div className="space-y-2">
              {filteredTopics.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No help topics found
                </div>
              ) : (
                filteredTopics.map((topic) => {
                  const style = getTopicStyle(topic.type)
                  const Icon = style.icon
                  const isExpanded = expandedTopics.has(topic.id)

                  return (
                    <Collapsible key={topic.id}>
                      <CollapsibleTrigger
                        onClick={() => toggleTopic(topic.id)}
                        className="w-full"
                      >
                        <div className={cn(
                          "flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors",
                          style.bg
                        )}>
                          <div className="flex items-center space-x-2">
                            <Icon className={cn("h-4 w-4", style.color)} />
                            <span className="text-sm font-medium text-left">
                              {topic.title}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {topic.type}
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 text-sm text-muted-foreground border-l-2 border-muted ml-3 mt-2">
                          {topic.content}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            {/* Step-specific resources */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Step Resources</h4>
              
              {resources.length > 0 ? (
                <div className="space-y-2">
                  {resources.map((resource, index) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{resource.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {resource.type}
                        </Badge>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No additional resources for this step
                </div>
              )}
            </div>

            <Separator />

            {/* General resources */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">General Resources</h4>
              <div className="space-y-2">
                <a
                  href="/docs"
                  target="_blank"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Documentation</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
                
                <a
                  href="/tutorials"
                  target="_blank"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Video Tutorials</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
                
                <a
                  href="/community"
                  target="_blank"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Community Forum</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Contact Support</h4>
              <p className="text-sm text-muted-foreground">
                Need personalized help? Our support team is here to assist you.
              </p>
              
              <div className="space-y-2">
                {supportOptions.map((option) => {
                  const Icon = option.icon
                  
                  return (
                    <button
                      key={option.id}
                      onClick={option.action}
                      className="w-full flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="p-2 rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm">{option.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                        {option.availability && (
                          <div className="text-xs text-green-600">
                            {option.availability}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Quick actions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  Report Issue
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  Request Feature
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  Give Feedback
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  Schedule Call
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}