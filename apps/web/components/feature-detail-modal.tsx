"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckIcon, ArrowRightIcon, ZapIcon, TargetIcon, CogIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FeatureCardData } from "./enhanced-feature-card"

interface FeatureDetailModalProps {
  feature: FeatureCardData | null
  isOpen: boolean
  onClose: () => void
}

export default function FeatureDetailModal({
  feature,
  isOpen,
  onClose,
}: FeatureDetailModalProps) {
  if (!feature) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-c9n-blue-dark border-windsurf-gray-medium/20">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={cn(
                "p-3 rounded-lg",
                feature.bgColor.replace("bg-", "bg-opacity-20 bg-")
              )}
            >
              {feature.icon}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                {feature.title}
              </DialogTitle>
              <DialogDescription className="text-windsurf-gray-light text-base">
                {feature.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-c9n-blue-mid">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-windsurf-purple-vibrant">
              <TargetIcon className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="technical" className="text-white data-[state=active]:bg-windsurf-blue-electric">
              <CogIcon className="w-4 h-4 mr-2" />
              Technical
            </TabsTrigger>
            <TabsTrigger value="use-cases" className="text-white data-[state=active]:bg-c9n-teal">
              <ZapIcon className="w-4 h-4 mr-2" />
              Use Cases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Key Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {feature.benefits?.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-c9n-blue-mid/50 border border-windsurf-gray-medium/20"
                    >
                      <CheckIcon className="w-5 h-5 text-c9n-teal mt-0.5 flex-shrink-0" />
                      <span className="text-windsurf-gray-light text-sm">{benefit}</span>
                    </div>
                  )) || (
                    <p className="text-windsurf-gray-light">No specific benefits listed for this feature.</p>
                  )}
                </div>
              </div>

              <div className="p-6 rounded-lg bg-gradient-to-r from-windsurf-purple-vibrant/10 to-windsurf-pink-hot/10 border border-windsurf-purple-vibrant/20">
                <h4 className="text-white font-semibold mb-2">Why This Matters</h4>
                <p className="text-windsurf-gray-light text-sm">
                  This feature represents a core capability of C9d.ai's AI orchestration platform, 
                  designed to streamline complex workflows and enhance productivity through intelligent automation.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="technical" className="mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Technical Specifications</h3>
                {feature.technicalSpecs && feature.technicalSpecs.length > 0 ? (
                  <div className="space-y-3">
                    {feature.technicalSpecs.map((spec, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-c9n-blue-mid border border-windsurf-blue-electric/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-windsurf-blue-electric border-windsurf-blue-electric/50">
                            Spec {index + 1}
                          </Badge>
                        </div>
                        <p className="text-windsurf-gray-light text-sm">{spec}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-c9n-blue-mid/50 border border-windsurf-gray-medium/20">
                    <h4 className="text-white font-semibold mb-2">Enterprise-Grade Architecture</h4>
                    <ul className="space-y-2 text-windsurf-gray-light text-sm">
                      <li>• Scalable cloud-native infrastructure</li>
                      <li>• RESTful API with comprehensive documentation</li>
                      <li>• Real-time processing with sub-second response times</li>
                      <li>• Enterprise security with SOC 2 Type II compliance</li>
                      <li>• 99.9% uptime SLA with global redundancy</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="use-cases" className="mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Real-World Applications</h3>
                {feature.useCases && feature.useCases.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feature.useCases.map((useCase, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-gradient-to-br from-c9n-teal/10 to-windsurf-green-lime/10 border border-c9n-teal/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ZapIcon className="w-4 h-4 text-c9n-teal" />
                          <Badge variant="outline" className="text-c9n-teal border-c9n-teal/50">
                            Use Case {index + 1}
                          </Badge>
                        </div>
                        <p className="text-windsurf-gray-light text-sm">{useCase}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-windsurf-purple-vibrant/10 to-windsurf-pink-hot/10 border border-windsurf-purple-vibrant/20">
                      <h4 className="text-white font-semibold mb-2">Enterprise Teams</h4>
                      <p className="text-windsurf-gray-light text-sm">
                        Large organizations leveraging AI orchestration for complex workflow automation and decision-making processes.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-windsurf-blue-electric/10 to-c9n-teal/10 border border-windsurf-blue-electric/20">
                      <h4 className="text-white font-semibold mb-2">Development Teams</h4>
                      <p className="text-windsurf-gray-light text-sm">
                        Software teams integrating AI capabilities into their applications through our comprehensive API platform.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-windsurf-yellow-bright/10 to-windsurf-green-lime/10 border border-windsurf-yellow-bright/20">
                      <h4 className="text-white font-semibold mb-2">Data Scientists</h4>
                      <p className="text-windsurf-gray-light text-sm">
                        Research teams utilizing advanced analytics and machine learning capabilities for data-driven insights.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-windsurf-pink-hot/10 to-windsurf-purple-vibrant/10 border border-windsurf-pink-hot/20">
                      <h4 className="text-white font-semibold mb-2">Startups</h4>
                      <p className="text-windsurf-gray-light text-sm">
                        Growing companies looking to scale their AI capabilities without the overhead of building infrastructure from scratch.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-6 border-t border-windsurf-gray-medium/20">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-windsurf-gray-medium/50 text-windsurf-gray-light hover:bg-windsurf-gray-medium/10"
          >
            Close
          </Button>
          <Button
            className="bg-purple-pink-gradient hover:opacity-90 text-white"
          >
            Get Started
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}