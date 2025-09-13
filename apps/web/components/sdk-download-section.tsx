"use client"

import React, { useState } from "react"
import { 
  DownloadIcon, 
  CopyIcon, 
  CheckIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  CodeIcon,
  TerminalIcon,
  FileTextIcon,
  PlayIcon
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface SDK {
  id: string
  name: string
  language: string
  version: string
  description: string
  icon: string
  downloadUrl: string
  docsUrl: string
  githubUrl: string
  installCommand: string
  quickStartCode: string
  features: string[]
  examples: {
    title: string
    description: string
    code: string
  }[]
  popularity: "high" | "medium" | "low"
  status: "stable" | "beta" | "alpha"
}

const sdks: SDK[] = [
  {
    id: "python",
    name: "Python SDK",
    language: "Python",
    version: "2.1.0",
    description: "Full-featured Python SDK with async support and comprehensive data science integrations",
    icon: "🐍",
    downloadUrl: "https://pypi.org/project/c9d-ai/",
    docsUrl: "https://docs.c9d.ai/python",
    githubUrl: "https://github.com/c9d-ai/python-sdk",
    installCommand: "pip install c9d-ai",
    quickStartCode: `from c9d_ai import C9dClient
import asyncio

# Initialize the client
client = C9dClient(api_key="your_api_key")

async def analyze_data():
    # Analyze your data
    result = await client.analyze({
        "data": {
            "source": "customer_data.csv",
            "format": "csv"
        },
        "analysis_type": "relationship_mapping"
    })
    
    print(f"Analysis ID: {result.analysis_id}")
    print(f"Status: {result.status}")
    
    # Get insights
    insights = await client.get_insights(result.analysis_id)
    for insight in insights.key_findings:
        print(f"- {insight.description}")

# Run the analysis
asyncio.run(analyze_data())`,
    features: [
      "Async/await support",
      "Pandas integration",
      "NumPy compatibility",
      "Jupyter notebook support",
      "Type hints included",
      "Comprehensive error handling"
    ],
    examples: [
      {
        title: "Data Analysis",
        description: "Analyze customer behavior patterns",
        code: `import pandas as pd
from c9d_ai import C9dClient

client = C9dClient(api_key="your_key")

# Load your data
df = pd.read_csv("customer_data.csv")

# Analyze with C9d.ai
result = client.analyze_dataframe(
    df, 
    analysis_type="customer_segmentation",
    target_column="purchase_amount"
)

print(f"Found {len(result.segments)} customer segments")
for segment in result.segments:
    print(f"Segment: {segment.name} ({segment.size} customers)")`
      },
      {
        title: "Real-time Processing",
        description: "Process streaming data in real-time",
        code: `from c9d_ai import StreamProcessor

processor = StreamProcessor(api_key="your_key")

@processor.on_data
async def handle_data(data):
    # Process incoming data
    insights = await processor.analyze(data)
    
    if insights.anomaly_detected:
        await send_alert(insights.anomaly_details)
    
    return insights

# Start processing
await processor.start(stream_url="kafka://localhost:9092/events")`
      }
    ],
    popularity: "high",
    status: "stable"
  },
  {
    id: "javascript",
    name: "JavaScript SDK",
    language: "JavaScript/TypeScript",
    version: "1.8.2",
    description: "Modern JavaScript SDK with TypeScript support for Node.js and browser environments",
    icon: "⚡",
    downloadUrl: "https://npmjs.com/package/@c9d/sdk",
    docsUrl: "https://docs.c9d.ai/javascript",
    githubUrl: "https://github.com/c9d-ai/javascript-sdk",
    installCommand: "npm install @c9d/sdk",
    quickStartCode: `import { C9dClient } from '@c9d/sdk';

// Initialize the client
const client = new C9dClient({
  apiKey: 'your_api_key',
  environment: 'production'
});

async function analyzeData() {
  try {
    // Analyze your data
    const result = await client.analyze({
      data: {
        source: 'user_interactions',
        format: 'json',
        filters: {
          date_range: {
            start: '2024-01-01',
            end: '2024-12-31'
          }
        }
      },
      analysisType: 'relationship_mapping'
    });

    console.log(\`Analysis ID: \${result.analysisId}\`);
    console.log(\`Status: \${result.status}\`);

    // Get insights
    const insights = await client.getInsights(result.analysisId);
    insights.keyFindings.forEach(finding => {
      console.log(\`- \${finding.description}\`);
    });

  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

analyzeData();`,
    features: [
      "TypeScript support",
      "Promise-based API",
      "Browser & Node.js compatible",
      "Automatic retries",
      "Request/response interceptors",
      "Built-in error handling"
    ],
    examples: [
      {
        title: "React Integration",
        description: "Use C9d.ai in React applications",
        code: `import React, { useState, useEffect } from 'react';
import { useC9d } from '@c9d/react-hooks';

function AnalyticsDashboard() {
  const { client, isLoading } = useC9d();
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    async function loadInsights() {
      const result = await client.analyze({
        data: { source: 'dashboard_metrics' },
        analysisType: 'trend_analysis'
      });
      
      const insights = await client.getInsights(result.analysisId);
      setInsights(insights);
    }

    if (!isLoading) {
      loadInsights();
    }
  }, [client, isLoading]);

  return (
    <div>
      {insights ? (
        <div>
          <h2>Key Insights</h2>
          {insights.keyFindings.map(finding => (
            <p key={finding.id}>{finding.description}</p>
          ))}
        </div>
      ) : (
        <p>Loading insights...</p>
      )}
    </div>
  );
}`
      },
      {
        title: "Node.js Server",
        description: "Server-side data processing",
        code: `const express = require('express');
const { C9dClient } = require('@c9d/sdk');

const app = express();
const client = new C9dClient({ apiKey: process.env.C9D_API_KEY });

app.post('/analyze', async (req, res) => {
  try {
    const { data, analysisType } = req.body;
    
    const result = await client.analyze({
      data,
      analysisType,
      options: {
        includeVisualization: true,
        confidenceThreshold: 0.8
      }
    });

    res.json({
      success: true,
      analysisId: result.analysisId,
      status: result.status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`
      }
    ],
    popularity: "high",
    status: "stable"
  },
  {
    id: "go",
    name: "Go SDK",
    language: "Go",
    version: "1.4.1",
    description: "High-performance Go SDK optimized for concurrent processing and microservices",
    icon: "🚀",
    downloadUrl: "https://pkg.go.dev/github.com/c9d-ai/go-sdk",
    docsUrl: "https://docs.c9d.ai/go",
    githubUrl: "https://github.com/c9d-ai/go-sdk",
    installCommand: "go get github.com/c9d-ai/go-sdk",
    quickStartCode: `package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/c9d-ai/go-sdk/client"
    "github.com/c9d-ai/go-sdk/types"
)

func main() {
    // Initialize the client
    c, err := client.New(&client.Config{
        APIKey:      "your_api_key",
        Environment: "production",
    })
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()

    // Analyze data
    result, err := c.Analyze(ctx, &types.AnalysisRequest{
        Data: &types.DataSource{
            Source: "transaction_logs",
            Format: "json",
        },
        AnalysisType: "anomaly_detection",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Analysis ID: %s\\n", result.AnalysisID)
    fmt.Printf("Status: %s\\n", result.Status)

    // Get insights
    insights, err := c.GetInsights(ctx, result.AnalysisID)
    if err != nil {
        log.Fatal(err)
    }

    for _, finding := range insights.KeyFindings {
        fmt.Printf("- %s\\n", finding.Description)
    }
}`,
    features: [
      "Context-aware operations",
      "Concurrent processing",
      "Structured logging",
      "Graceful error handling",
      "Connection pooling",
      "Metrics integration"
    ],
    examples: [
      {
        title: "Concurrent Analysis",
        description: "Process multiple datasets concurrently",
        code: `package main

import (
    "context"
    "sync"
    
    "github.com/c9d-ai/go-sdk/client"
)

func processDatasets(datasets []string) {
    c, _ := client.New(&client.Config{APIKey: "your_key"})
    
    var wg sync.WaitGroup
    results := make(chan *types.AnalysisResult, len(datasets))
    
    for _, dataset := range datasets {
        wg.Add(1)
        go func(ds string) {
            defer wg.Done()
            
            result, err := c.Analyze(context.Background(), &types.AnalysisRequest{
                Data: &types.DataSource{Source: ds},
                AnalysisType: "pattern_recognition",
            })
            
            if err == nil {
                results <- result
            }
        }(dataset)
    }
    
    go func() {
        wg.Wait()
        close(results)
    }()
    
    for result := range results {
        fmt.Printf("Completed analysis: %s\\n", result.AnalysisID)
    }
}`
      }
    ],
    popularity: "medium",
    status: "stable"
  },
  {
    id: "java",
    name: "Java SDK",
    language: "Java",
    version: "1.6.0",
    description: "Enterprise-grade Java SDK with Spring Boot integration and comprehensive documentation",
    icon: "☕",
    downloadUrl: "https://mvnrepository.com/artifact/ai.c9d/java-sdk",
    docsUrl: "https://docs.c9d.ai/java",
    githubUrl: "https://github.com/c9d-ai/java-sdk",
    installCommand: `<dependency>
    <groupId>ai.c9d</groupId>
    <artifactId>java-sdk</artifactId>
    <version>1.6.0</version>
</dependency>`,
    quickStartCode: `import ai.c9d.client.C9dClient;
import ai.c9d.client.C9dClientBuilder;
import ai.c9d.types.AnalysisRequest;
import ai.c9d.types.AnalysisResult;
import ai.c9d.types.DataSource;

public class QuickStart {
    public static void main(String[] args) {
        // Initialize the client
        C9dClient client = new C9dClientBuilder()
            .apiKey("your_api_key")
            .environment("production")
            .build();

        try {
            // Create analysis request
            AnalysisRequest request = AnalysisRequest.builder()
                .data(DataSource.builder()
                    .source("sales_data")
                    .format("csv")
                    .build())
                .analysisType("forecasting")
                .build();

            // Analyze data
            AnalysisResult result = client.analyze(request);
            
            System.out.println("Analysis ID: " + result.getAnalysisId());
            System.out.println("Status: " + result.getStatus());

            // Get insights
            var insights = client.getInsights(result.getAnalysisId());
            insights.getKeyFindings().forEach(finding -> 
                System.out.println("- " + finding.getDescription())
            );

        } catch (Exception e) {
            System.err.println("Analysis failed: " + e.getMessage());
        }
    }
}`,
    features: [
      "Spring Boot integration",
      "Builder pattern APIs",
      "Comprehensive JavaDoc",
      "Exception handling",
      "Connection pooling",
      "Metrics and monitoring"
    ],
    examples: [
      {
        title: "Spring Boot Integration",
        description: "Use C9d.ai in Spring Boot applications",
        code: `@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    
    @Autowired
    private C9dClient c9dClient;
    
    @PostMapping("/analyze")
    public ResponseEntity<AnalysisResponse> analyze(@RequestBody AnalysisRequest request) {
        try {
            var result = c9dClient.analyze(request);
            
            return ResponseEntity.ok(AnalysisResponse.builder()
                .analysisId(result.getAnalysisId())
                .status(result.getStatus())
                .build());
                
        } catch (C9dException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(AnalysisResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping("/insights/{analysisId}")
    public ResponseEntity<InsightsResponse> getInsights(@PathVariable String analysisId) {
        var insights = c9dClient.getInsights(analysisId);
        return ResponseEntity.ok(InsightsResponse.from(insights));
    }
}`
      }
    ],
    popularity: "medium",
    status: "stable"
  },
  {
    id: "rust",
    name: "Rust SDK",
    language: "Rust",
    version: "0.3.1",
    description: "Memory-safe Rust SDK with async support and zero-cost abstractions",
    icon: "🦀",
    downloadUrl: "https://crates.io/crates/c9d-ai",
    docsUrl: "https://docs.c9d.ai/rust",
    githubUrl: "https://github.com/c9d-ai/rust-sdk",
    installCommand: `[dependencies]
c9d-ai = "0.3.1"
tokio = { version = "1.0", features = ["full"] }`,
    quickStartCode: `use c9d_ai::{Client, AnalysisRequest, DataSource};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the client
    let client = Client::new("your_api_key")?;

    // Create analysis request
    let request = AnalysisRequest::builder()
        .data(DataSource::new("performance_metrics", "json"))
        .analysis_type("optimization")
        .build();

    // Analyze data
    let result = client.analyze(request).await?;
    
    println!("Analysis ID: {}", result.analysis_id);
    println!("Status: {:?}", result.status);

    // Get insights
    let insights = client.get_insights(&result.analysis_id).await?;
    for finding in insights.key_findings {
        println!("- {}", finding.description);
    }

    Ok(())
}`,
    features: [
      "Memory safety",
      "Zero-cost abstractions",
      "Async/await support",
      "Type-safe APIs",
      "Error handling with Result",
      "Serde integration"
    ],
    examples: [
      {
        title: "High-Performance Processing",
        description: "Process large datasets efficiently",
        code: `use c9d_ai::{Client, StreamProcessor};
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("your_key")?;
    
    let mut processor = StreamProcessor::new(client)
        .batch_size(1000)
        .parallel_workers(8)
        .build();
    
    let mut stream = processor.process_stream("data_stream").await?;
    
    while let Some(result) = stream.next().await {
        match result {
            Ok(analysis) => {
                println!("Processed batch: {}", analysis.batch_id);
                
                if analysis.anomalies_detected > 0 {
                    send_alert(&analysis).await?;
                }
            }
            Err(e) => eprintln!("Processing error: {}", e),
        }
    }
    
    Ok(())
}`
      }
    ],
    popularity: "low",
    status: "beta"
  }
]

export function SDKDownloadSection() {
  const [selectedSDK, setSelectedSDK] = useState(sdks[0])
  const [activeTab, setActiveTab] = useState("quickstart")
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "stable": return "bg-windsurf-green-lime text-c9n-blue-dark"
      case "beta": return "bg-windsurf-yellow-bright text-c9n-blue-dark"
      case "alpha": return "bg-windsurf-pink-hot text-white"
      default: return "bg-windsurf-gray-light text-c9n-blue-dark"
    }
  }

  const getPopularityColor = (popularity: string) => {
    switch (popularity) {
      case "high": return "text-windsurf-green-lime"
      case "medium": return "text-windsurf-yellow-bright"
      case "low": return "text-windsurf-gray-light"
      default: return "text-windsurf-gray-light"
    }
  }

  return (
    <div className="space-y-6">
      {/* SDK Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sdks.map((sdk) => (
          <Card
            key={sdk.id}
            className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
              selectedSDK.id === sdk.id
                ? "bg-windsurf-pink-hot/20 border-windsurf-pink-hot text-white"
                : "bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-windsurf-gray-light hover:text-white"
            }`}
            onClick={() => setSelectedSDK(sdk)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sdk.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{sdk.name}</CardTitle>
                    <CardDescription className="text-sm opacity-80">
                      v{sdk.version}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Badge className={getStatusColor(sdk.status)}>
                    {sdk.status}
                  </Badge>
                  <div className={`text-xs ${getPopularityColor(sdk.popularity)}`}>
                    {sdk.popularity} demand
                  </div>
                </div>
              </div>
              <CardDescription className="text-sm opacity-80 mt-2">
                {sdk.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-xs">
                <DownloadIcon className="h-3 w-3" />
                <span>Download from {sdk.downloadUrl.includes('pypi') ? 'PyPI' : 
                                   sdk.downloadUrl.includes('npmjs') ? 'npm' :
                                   sdk.downloadUrl.includes('pkg.go.dev') ? 'Go Packages' :
                                   sdk.downloadUrl.includes('mvnrepository') ? 'Maven' :
                                   'Registry'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected SDK Details */}
      <Card className="bg-windsurf-purple-deep/30 border-windsurf-gray-light/20 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{selectedSDK.icon}</span>
              <div>
                <CardTitle className="text-2xl">{selectedSDK.name}</CardTitle>
                <CardDescription className="text-windsurf-gray-light">
                  {selectedSDK.description}
                </CardDescription>
                <div className="flex items-center gap-4 mt-2">
                  <Badge className={getStatusColor(selectedSDK.status)}>
                    {selectedSDK.status} v{selectedSDK.version}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-windsurf-gray-light">
                    <span className={getPopularityColor(selectedSDK.popularity)}>●</span>
                    {selectedSDK.popularity} demand
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-c9n-teal text-c9n-teal hover:bg-c9n-teal hover:text-white"
              >
                <a href={selectedSDK.docsUrl} target="_blank" rel="noopener noreferrer">
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                  Docs
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-windsurf-gray-light text-windsurf-gray-light hover:bg-windsurf-gray-light hover:text-c9n-blue-dark"
              >
                <a href={selectedSDK.githubUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                  GitHub
                </a>
              </Button>
              <Button
                asChild
                className="bg-windsurf-pink-hot hover:bg-windsurf-pink-hot/90"
              >
                <a href={selectedSDK.downloadUrl} target="_blank" rel="noopener noreferrer">
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-windsurf-purple-deep/50">
              <TabsTrigger value="quickstart" className="data-[state=active]:bg-windsurf-pink-hot">
                <PlayIcon className="h-4 w-4 mr-2" />
                Quick Start
              </TabsTrigger>
              <TabsTrigger value="install" className="data-[state=active]:bg-windsurf-pink-hot">
                <TerminalIcon className="h-4 w-4 mr-2" />
                Installation
              </TabsTrigger>
              <TabsTrigger value="examples" className="data-[state=active]:bg-windsurf-pink-hot">
                <CodeIcon className="h-4 w-4 mr-2" />
                Examples
              </TabsTrigger>
              <TabsTrigger value="features" className="data-[state=active]:bg-windsurf-pink-hot">
                <FileTextIcon className="h-4 w-4 mr-2" />
                Features
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quickstart" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-windsurf-yellow-bright mb-2">Quick Start Guide</h3>
                  <p className="text-sm text-windsurf-gray-light mb-4">
                    Get started with {selectedSDK.name} in minutes. This example shows the basic usage pattern.
                  </p>
                </div>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10 text-windsurf-gray-light hover:text-white"
                    onClick={() => copyToClipboard(selectedSDK.quickStartCode, 'quickstart')}
                  >
                    {copiedStates.quickstart ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <pre className="bg-c9n-blue-dark p-4 rounded-lg overflow-x-auto text-sm">
                    <code className="text-windsurf-gray-light">
                      {selectedSDK.quickStartCode}
                    </code>
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="install" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-windsurf-yellow-bright mb-2">Installation</h3>
                  <p className="text-sm text-windsurf-gray-light mb-4">
                    Install {selectedSDK.name} using your preferred package manager.
                  </p>
                </div>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10 text-windsurf-gray-light hover:text-white"
                    onClick={() => copyToClipboard(selectedSDK.installCommand, 'install')}
                  >
                    {copiedStates.install ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <pre className="bg-c9n-blue-dark p-4 rounded-lg overflow-x-auto text-sm">
                    <code className="text-windsurf-gray-light">
                      {selectedSDK.installCommand}
                    </code>
                  </pre>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-c9n-teal mb-1">{selectedSDK.version}</div>
                    <div className="text-sm text-windsurf-gray-light">Latest Version</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-windsurf-yellow-bright mb-1">
                      {selectedSDK.status === 'stable' ? '✓' : selectedSDK.status === 'beta' ? 'β' : 'α'}
                    </div>
                    <div className="text-sm text-windsurf-gray-light">Status: {selectedSDK.status}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-windsurf-pink-hot mb-1">
                      {selectedSDK.popularity === 'high' ? '🔥' : selectedSDK.popularity === 'medium' ? '📈' : '🌱'}
                    </div>
                    <div className="text-sm text-windsurf-gray-light">{selectedSDK.popularity} demand</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="examples" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-windsurf-yellow-bright mb-2">Code Examples</h3>
                  <p className="text-sm text-windsurf-gray-light mb-4">
                    Practical examples showing common use cases and integration patterns.
                  </p>
                </div>
                {selectedSDK.examples.map((example, index) => (
                  <div key={index} className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-white">{example.title}</h4>
                      <p className="text-sm text-windsurf-gray-light">{example.description}</p>
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 z-10 text-windsurf-gray-light hover:text-white"
                        onClick={() => copyToClipboard(example.code, `example-${index}`)}
                      >
                        {copiedStates[`example-${index}`] ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <pre className="bg-c9n-blue-dark p-4 rounded-lg overflow-x-auto text-sm">
                        <code className="text-windsurf-gray-light">
                          {example.code}
                        </code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="features" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-windsurf-yellow-bright mb-2">Key Features</h3>
                  <p className="text-sm text-windsurf-gray-light mb-4">
                    {selectedSDK.name} includes these powerful features to accelerate your development.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSDK.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-windsurf-purple-deep/50 rounded-lg">
                      <div className="w-2 h-2 bg-c9n-teal rounded-full flex-shrink-0" />
                      <span className="text-sm text-windsurf-gray-light">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-windsurf-purple-deep/50 rounded-lg">
                  <h4 className="font-semibold text-windsurf-yellow-bright mb-2">Need Help?</h4>
                  <p className="text-sm text-windsurf-gray-light mb-3">
                    Get started quickly with our comprehensive documentation and community support.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-c9n-teal text-c9n-teal hover:bg-c9n-teal hover:text-white"
                    >
                      <a href={selectedSDK.docsUrl} target="_blank" rel="noopener noreferrer">
                        View Documentation
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-windsurf-gray-light text-windsurf-gray-light hover:bg-windsurf-gray-light hover:text-c9n-blue-dark"
                    >
                      <a href={selectedSDK.githubUrl} target="_blank" rel="noopener noreferrer">
                        View on GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}