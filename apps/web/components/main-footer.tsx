import Link from "next/link"
import { C9DLogo } from "./icons" // Assuming C9DLogo is in icons.tsx
import { GithubIcon, TwitterIcon, LinkedinIcon } from "lucide-react"

const footerLinks = {
  product: [
    { name: "Platform Overview", href: "/platform" },
    { name: "Insight Engine", href: "/features/insight-engine" },
    { name: "Rapid Reporting", href: "/features/rapid-reporting" },
    { name: "Pricing", href: "/pricing" },
    { name: "For Enterprise", href: "/solutions/enterprise" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "/careers" },
    { name: "Contact Us", href: "/contact" },
    { name: "Partnerships", href: "/partners" },
  ],
  resources: [
    { name: "Documentation", href: "/docs" },
    { name: "Changelog", href: "/changelog" },
    { name: "Support Center", href: "/support" },
    { name: "FAQ", href: "/faq" },
    { name: "Brand Assets", href: "/brand" },
  ],
  legal: [
    { name: "Terms of Service", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Security", href: "/security" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
}

export default function MainFooter() {
  return (
    <footer className="bg-[#061222] text-gray-400 border-t border-gray-700/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 xl:gap-12">
          <div className="col-span-2 lg:col-span-1 mb-8 lg:mb-0">
            <Link href="/" className="inline-block mb-4">
              <C9DLogo className="h-8 w-auto text-white" />
            </Link>
            <p className="text-sm">Leveraging AI to bring you relevant information and better analysis.</p>
            <div className="flex space-x-4 mt-6">
              <Link href="#" className="hover:text-[#2CE4B8]">
                <GithubIcon className="h-5 w-5" />
              </Link>
              <Link href="#" className="hover:text-[#2CE4B8]">
                <TwitterIcon className="h-5 w-5" />
              </Link>
              <Link href="#" className="hover:text-[#2CE4B8]">
                <LinkedinIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">Product</h3>
            <ul role="list" className="mt-4 space-y-2">
              {footerLinks.product.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm hover:text-[#2CE4B8]">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">Company</h3>
            <ul role="list" className="mt-4 space-y-2">
              {footerLinks.company.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm hover:text-[#2CE4B8]">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">Resources</h3>
            <ul role="list" className="mt-4 space-y-2">
              {footerLinks.resources.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm hover:text-[#2CE4B8]">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 md:mt-0 col-span-2 md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">Legal</h3>
            <ul role="list" className="mt-4 space-y-2">
              {footerLinks.legal.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm hover:text-[#2CE4B8]">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-700 pt-8 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} C9D.AI Corporation. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
