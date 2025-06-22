import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const posts = [
  {
    title: "Our Vision: The Future of AI-Powered Analysis",
    category: "COMPANY",
    date: "Jun 20, 2025",
    readTime: "4 min read",
    imageUrl: "/placeholder.svg?width=400&height=250",
    link: "/blog/our-vision",
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
  return (
    <section className="py-16 md:py-24 bg-[#0F203A]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4 md:mb-0">
            Insights & <span className="text-[#2CE4B8]">Updates</span>
          </h2>
          <Button asChild variant="outline" className="border-[#2CE4B8] text-[#2CE4B8] hover:bg-[#2CE4B8]/10">
            <Link href="/blog">See all articles</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link
              href={post.link}
              key={post.title}
              className="group block bg-[#0A192F] rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-[#2CE4B8]/50 transition-all duration-300"
            >
              <Image
                src={post.imageUrl || "/placeholder.svg"}
                alt={post.title}
                width={400}
                height={250}
                className="w-full h-48 object-cover group-hover:opacity-80 transition-opacity"
              />
              <div className="p-6">
                <p className="text-xs font-semibold text-[#2CE4B8] uppercase tracking-wider mb-1">{post.category}</p>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#2CE4B8] transition-colors">
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
    </section>
  )
}
