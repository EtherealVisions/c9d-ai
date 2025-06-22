import AnnouncementBar from "@/components/announcement-bar"
import HeaderNav from "@/components/header-nav"
import HeroSection from "@/components/hero-section"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0A192F] text-gray-100">
      <AnnouncementBar />
      <HeaderNav />
      <main className="flex-grow">
        <HeroSection />
      </main>
      {/* Add a simple footer if desired */}
      <footer className="py-8 text-center text-sm text-gray-400 border-t border-gray-700">
        © {new Date().getFullYear()} C9N.AI. All rights reserved.
      </footer>
    </div>
  )
}
