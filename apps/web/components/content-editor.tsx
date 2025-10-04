"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  SaveIcon, 
  UploadIcon, 
  DownloadIcon, 
  PlusIcon, 
  TrashIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from "lucide-react"
import { 
  ContentManager, 
  LandingPageContent,
  HeroContent,
  C9CapabilityContent,
  FeatureContent,
  TestimonialContent,
  DEFAULT_LANDING_PAGE_CONTENT 
} from "@/lib/content/landing-page-content"

export default function ContentEditor() {
  const [contentManager] = useState(() => new ContentManager())
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_LANDING_PAGE_CONTENT)
  const [savedStatus, setSavedStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    // Load content from localStorage on mount
    const savedContent = localStorage.getItem('landing-page-content')
    if (savedContent) {
      const result = contentManager.importContent(savedContent)
      if (result.success) {
        setContent(contentManager.getContent())
      }
    }
  }, [contentManager])

  const handleSave = async () => {
    setSavedStatus('saving')
    const validation = contentManager.validateContent()
    
    if (!validation.valid) {
      setValidationErrors(validation.errors)
      setSavedStatus('unsaved')
      return
    }

    setValidationErrors([])
    
    // Save to localStorage (in production, this would be an API call)
    localStorage.setItem('landing-page-content', contentManager.exportContent())
    
    // Simulate async save
    await new Promise(resolve => setTimeout(resolve, 500))
    setSavedStatus('saved')
  }

  const handleExport = () => {
    const dataStr = contentManager.exportContent()
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `landing-content-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const result = contentManager.importContent(content)
      
      if (result.success) {
        setContent(contentManager.getContent())
        setSavedStatus('unsaved')
        setValidationErrors([])
      } else {
        setValidationErrors([result.error || 'Import failed'])
      }
    }
    reader.readAsText(file)
  }

  const updateHero = (field: keyof HeroContent, value: string) => {
    const updated = contentManager.updateHero({ [field]: value })
    setContent(updated)
    setSavedStatus('unsaved')
  }

  const updateCapability = (id: C9CapabilityContent['id'], field: keyof C9CapabilityContent, value: any) => {
    const updated = contentManager.updateCapability(id, { [field]: value })
    setContent(updated)
    setSavedStatus('unsaved')
  }

  const updateCapabilityFeature = (id: C9CapabilityContent['id'], index: number, value: string) => {
    const capability = content.capabilities.find(c => c.id === id)
    if (capability) {
      const newFeatures = [...capability.keyFeatures]
      newFeatures[index] = value
      const updated = contentManager.updateCapability(id, { keyFeatures: newFeatures })
      setContent(updated)
      setSavedStatus('unsaved')
    }
  }

  const addCapabilityFeature = (id: C9CapabilityContent['id']) => {
    const capability = content.capabilities.find(c => c.id === id)
    if (capability) {
      const newFeatures = [...capability.keyFeatures, '']
      const updated = contentManager.updateCapability(id, { keyFeatures: newFeatures })
      setContent(updated)
      setSavedStatus('unsaved')
    }
  }

  const removeCapabilityFeature = (id: C9CapabilityContent['id'], index: number) => {
    const capability = content.capabilities.find(c => c.id === id)
    if (capability) {
      const newFeatures = capability.keyFeatures.filter((_, i) => i !== index)
      const updated = contentManager.updateCapability(id, { keyFeatures: newFeatures })
      setContent(updated)
      setSavedStatus('unsaved')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Landing Page Content Editor</h1>
          <p className="text-windsurf-gray-light mt-2">
            Manage and update content for the C9D.AI landing page
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {savedStatus === 'saved' && (
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            )}
            <span className={cn(
              "text-sm",
              savedStatus === 'saved' ? "text-green-400" : 
              savedStatus === 'saving' ? "text-yellow-400" : 
              "text-orange-400"
            )}>
              {savedStatus === 'saved' ? 'All changes saved' :
               savedStatus === 'saving' ? 'Saving...' :
               'Unsaved changes'}
            </span>
          </div>
          
          <Button
            onClick={handleSave}
            disabled={savedStatus === 'saving'}
            className="bg-windsurf-pink-hot hover:bg-windsurf-pink-hot/90"
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExport}
            className="border-windsurf-gray-dark text-windsurf-gray-light hover:text-white"
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <label htmlFor="import-file">
            <Button
              variant="outline"
              className="border-windsurf-gray-dark text-windsurf-gray-light hover:text-white cursor-pointer"
              asChild
            >
              <span>
                <UploadIcon className="w-4 h-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert className="mb-6 bg-red-900/20 border-red-500/30">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="hero" className="space-y-4">
        <TabsList className="bg-windsurf-purple-deep border-windsurf-gray-dark">
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="capabilities">C9 Capabilities</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
            <CardHeader>
              <CardTitle className="text-white">Hero Section Content</CardTitle>
              <CardDescription className="text-windsurf-gray-light">
                Edit the main hero section content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hero-title" className="text-windsurf-gray">Title</Label>
                  <Input
                    id="hero-title"
                    value={content.hero.title}
                    onChange={(e) => updateHero('title', e.target.value)}
                    className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="hero-highlight" className="text-windsurf-gray">Highlighted Text</Label>
                  <Input
                    id="hero-highlight"
                    value={content.hero.highlightedText}
                    onChange={(e) => updateHero('highlightedText', e.target.value)}
                    className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="hero-subtitle" className="text-windsurf-gray">Subtitle</Label>
                <Textarea
                  id="hero-subtitle"
                  value={content.hero.subtitle}
                  onChange={(e) => updateHero('subtitle', e.target.value)}
                  className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hero-cta-text" className="text-windsurf-gray">CTA Text</Label>
                  <Input
                    id="hero-cta-text"
                    value={content.hero.ctaText}
                    onChange={(e) => updateHero('ctaText', e.target.value)}
                    className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="hero-cta-href" className="text-windsurf-gray">CTA Link</Label>
                  <Input
                    id="hero-cta-href"
                    value={content.hero.ctaHref}
                    onChange={(e) => updateHero('ctaHref', e.target.value)}
                    className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="hero-bottom" className="text-windsurf-gray">Bottom Text</Label>
                <Input
                  id="hero-bottom"
                  value={content.hero.bottomText}
                  onChange={(e) => updateHero('bottomText', e.target.value)}
                  className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities">
          <div className="space-y-6">
            {content.capabilities.map((capability) => (
              <Card key={capability.id} className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
                <CardHeader>
                  <CardTitle className="text-white">{capability.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-windsurf-gray">Tagline</Label>
                    <Input
                      value={capability.tagline}
                      onChange={(e) => updateCapability(capability.id, 'tagline', e.target.value)}
                      className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-windsurf-gray">Description</Label>
                    <Textarea
                      value={capability.description}
                      onChange={(e) => updateCapability(capability.id, 'description', e.target.value)}
                      className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-windsurf-gray">Key Features</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addCapabilityFeature(capability.id)}
                        className="text-c9n-teal hover:text-c9n-teal/80"
                      >
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Add Feature
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {capability.keyFeatures.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={feature}
                            onChange={(e) => updateCapabilityFeature(capability.id, idx, e.target.value)}
                            className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeCapabilityFeature(capability.id, idx)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-windsurf-gray">CTA Text</Label>
                      <Input
                        value={capability.ctaText}
                        onChange={(e) => updateCapability(capability.id, 'ctaText', e.target.value)}
                        className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-windsurf-gray">CTA Link</Label>
                      <Input
                        value={capability.ctaHref}
                        onChange={(e) => updateCapability(capability.id, 'ctaHref', e.target.value)}
                        className="bg-c9n-blue-dark border-windsurf-gray-dark text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="features">
          <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
            <CardHeader>
              <CardTitle className="text-white">Features Section</CardTitle>
              <CardDescription className="text-windsurf-gray-light">
                Manage feature cards displayed on the landing page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-windsurf-gray-light">Feature management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials">
          <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
            <CardHeader>
              <CardTitle className="text-white">Testimonials</CardTitle>
              <CardDescription className="text-windsurf-gray-light">
                Manage customer testimonials and reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-windsurf-gray-light">Testimonial management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata">
          <Card className="bg-windsurf-purple-deep/50 border-windsurf-gray-dark">
            <CardHeader>
              <CardTitle className="text-white">Content Metadata</CardTitle>
              <CardDescription className="text-windsurf-gray-light">
                Version and update information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-windsurf-gray">Last Updated:</span>
                <span className="ml-2 text-white">
                  {new Date(content.metadata.lastUpdated).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-windsurf-gray">Version:</span>
                <span className="ml-2 text-white">{content.metadata.version}</span>
              </div>
              <div>
                <span className="text-windsurf-gray">Author:</span>
                <span className="ml-2 text-white">{content.metadata.author || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}