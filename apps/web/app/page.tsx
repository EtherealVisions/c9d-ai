import AnnouncementBar from "@/components/announcement-bar"
import HeaderNav from "@/components/header-nav"
import HeroSection from "@/components/hero-section"
import BuildSection from "@/components/build-section"
import SectionNavigator from "@/components/section-navigator"
import MainFooter from "@/components/main-footer"
import PerformanceMonitor from "@/components/performance-monitor"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-dify-gray-900">
      <PerformanceMonitor />
      <SectionNavigator />
      <AnnouncementBar />
      <HeaderNav />
      <main className="flex-grow">
        <div id="hero">
          <HeroSection />
        </div>
        
        <div id="build">
          <BuildSection />
        </div>
        
        {/* Connect Section */}
        <section id="connect" className="py-20 md:py-28 lg:py-32 bg-dify-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="order-2 lg:order-1">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-dify-gray-100 to-white rounded-lg shadow-xl">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-dify-gray-500">Integration Dashboard</p>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 bg-dify-blue rounded-full"></div>
                  <span className="text-sm font-semibold text-dify-blue uppercase tracking-wider">CONNECT</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-dify-gray-900 mb-6">
                  Supercharge AI applications with{" "}
                  <span className="text-dify-blue">global LLMs, RAG pipelines, tools, agent strategies, and more.</span>
                </h2>
                <div className="space-y-4 text-lg text-dify-gray-600">
                  <p>Get Your Data LLM Ready with RAG</p>
                  <p>Bridge Your Systems / Platforms with Native MCP Integration</p>
                  <p>Publish as an Universal MCP Server</p>
                  <p>Add Wings with Tools</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise Section */}
        <section id="enterprise" className="py-20 md:py-28 lg:py-32 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-dify-blue rounded-full"></div>
                <span className="text-sm font-semibold text-dify-blue uppercase tracking-wider">ENTERPRISE</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-dify-gray-900 mb-6">
                Solid AI Infrastructure
                <br />
                <span className="text-dify-blue">for Enterprise Success</span>
              </h2>
              <p className="text-lg text-dify-gray-600 mb-8">
                The AI transformation for enterprise requires not just tools, but grounded infrastructure. 
                C9D.AI offers a reliable platform to distribute AI capabilities across multiple departments 
                for unparalleled efficiency.
              </p>
              <a href="/enterprise" className="text-dify-blue font-medium hover:underline inline-flex items-center gap-2">
                Learn More 
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Startup Section */}
        <section id="startup" className="py-20 md:py-28 lg:py-32 bg-dify-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-dify-blue rounded-full"></div>
                <span className="text-sm font-semibold text-dify-blue uppercase tracking-wider">STARTUP</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-dify-gray-900 mb-4">
                Ship <span className="text-dify-blue">FAST</span>
              </h2>
              <p className="text-lg text-dify-gray-600">
                Enjoy everything out of the box and hit MVP with speed and agility in record time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-dify-blue/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <div className="w-8 h-8 bg-dify-blue rounded"></div>
                </div>
                <h3 className="text-xl font-semibold text-dify-gray-900 mb-2">Go to Market at Velocity</h3>
                <p className="text-dify-gray-600">
                  Focus on your idea and validate your idea in record time without complex settings.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-dify-blue/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <div className="w-8 h-8 bg-dify-blue rounded-full"></div>
                </div>
                <h3 className="text-xl font-semibold text-dify-gray-900 mb-2">Pivot with Agility, Not Pain</h3>
                <p className="text-dify-gray-600">
                  Easily bridge to models and tools that bring your application to the next level.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-dify-blue/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-dify-blue" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-dify-gray-900 mb-2">Data-Driven Success</h3>
                <p className="text-dify-gray-600">
                  Iterate based on concrete insights, and march towards product-market fit from the start.
                </p>
              </div>
            </div>

            <div className="text-center">
              <a href="/sign-up" className="inline-flex items-center gap-2 px-8 py-3 bg-dify-blue text-white font-medium rounded-lg hover:bg-dify-blue-dark transition-colors">
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section id="community" className="py-20 md:py-28 lg:py-32 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-dify-blue rounded-full"></div>
                <span className="text-sm font-semibold text-dify-blue uppercase tracking-wider">COMMUNITY</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-dify-gray-900 mb-6">
                Become Part of Our
                <br />
                <span className="text-dify-blue">Vibrant Community</span>
              </h2>
              <p className="text-lg text-dify-gray-600 mb-12">
                C9D.AI is powered by the community of AI innovators worldwide. Join us and push the boundary of GenAI app development platform.
              </p>

              <div className="grid grid-cols-3 gap-8 mb-12">
                <div>
                  <p className="text-4xl font-bold text-dify-blue mb-2">5M+</p>
                  <p className="text-dify-gray-600">Downloads</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-dify-blue mb-2">116.4k</p>
                  <p className="text-dify-gray-600">Stars</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-dify-blue mb-2">800+</p>
                  <p className="text-dify-gray-600">Contributors</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="https://github.com/c9d-ai" className="inline-flex items-center gap-2 px-8 py-3 bg-dify-blue text-white font-medium rounded-lg hover:bg-dify-blue-dark transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
                <a href="/discord" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-dify-gray-700 border border-dify-gray-200 font-medium rounded-lg hover:bg-dify-gray-50 transition-colors">
                  Join Discord
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MainFooter />
    </div>
  )
}