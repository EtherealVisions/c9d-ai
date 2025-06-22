import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon } from "lucide-react"

const posts = [
  {
    title: "Our Vision: The Future of AI-Powered Analysis",
    category: "COMPANY",
    date: "Jun 20, 2025",
    readTime: "4 min read",
    imageUrl: "/placeholder.svg?width=400&height=250",
    link: "/blog/our-vision",
    featured: true,
  },
  {
    title: "Maximizing Insight Generation with C9N.AI",
    category: "PRODUCT",
    date: "Jun 13, 2025",
    readTime: "9 min read",
    imageUrl: "/placeholder.svg?width=400&height=250",
    link: "/blog/maximizing-insights",
  },
  {
    title: "Nexus Engine v2.0: Key Updates",
    category: "PRODUCT",
    date: "Jun 12, 2025",
    readTime: "4 min read",
    imageUrl: "/placeholder.svg?width=400&height=250",
    link: "/blog/nexus-engine-v2",
  },
]

export default function BlogPreviewSection() {
  const featuredPost = posts.find((p) => p.featured) || posts[0]
  const otherPosts = posts.filter((p) => p !== featuredPost).slice(0, 2) // Show 2 other posts

  return (
    <section className="py-16 md:py-24 bg-c9n-blue-mid">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4 md:mb-0">
            Insights & <span className="text-c9n-teal">Updates</span>
          </h2>
          <Button
            asChild
            variant="outline"
            className="border-c9n-teal text-c9n-teal hover:bg-c9n-teal/10 hover:text-white font-semibold group"
          >
            <Link href="/blog">
              See all articles{" "}
              <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Featured Post */}
          <Link
            href={featuredPost.link}
            className="group block bg-c9n-blue-dark rounded-xl shadow-2xl overflow-hidden border border-gray-700 hover:border-c9n-teal/70 transition-all duration-300 lg:col-span-1 flex flex-col"
          >
            <div className="relative w-full h-64 sm:h-80 md:h-96">
              <Image
                src={featuredPost.imageUrl || "/placeholder.svg"}
                alt={featuredPost.title}
                layout="fill"
                objectFit="cover"
                className="group-hover:scale-105 transition-transform duration-500 ease-in-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6">
                <span className="inline-block bg-windsurf-pink-hot text-white text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded mb-2">
                  {featuredPost.category} {featuredPost.featured ? "• FEATURED" : ""}
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold text-white mb-2 group-hover:text-c9n-teal transition-colors">
                  {featuredPost.title}
                </h3>
              </div>
            </div>
            <div className="p-6 bg-c9n-blue-dark flex-grow">
              <p className="text-sm text-gray-400">
                {featuredPost.date} &bull; {featuredPost.readTime}
              </p>
            </div>
          </Link>

          {/* Other Posts */}
          <div className="lg:col-span-1 space-y-8">
            {otherPosts.map((post) => (
              <Link
                href={post.link}
                key={post.title}
                className="group block bg-c9n-blue-dark rounded-xl shadow-lg overflow-hidden border border-gray-700 hover:border-c9n-teal/50 transition-all duration-300 flex items-center space-x-4 p-4 hover:bg-c9n-blue-mid/50"
              >
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={post.imageUrl || "/placeholder.svg"}
                    alt={post.title}
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-50 group-hover:opacity-20 transition-opacity"></div>
                </div>
                <div className="flex-grow">
                  <p className="text-xs font-semibold text-windsurf-pink-hot uppercase tracking-wider mb-1">
                    {post.category}
                  </p>
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-c9n-teal transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {post.date} &bull; {post.readTime}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
