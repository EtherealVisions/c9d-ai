"use client" // For DropdownMenu and potential mobile menu state

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDownIcon, UserIcon, MenuIcon } from "lucide-react"
import { useState } from "react"
import { C9DLogo } from "./icons" // Assuming a simple SVG logo

const navItems = [
  {
    name: "Products",
    href: "#",
    subItems: [
      { name: "Platform", href: "#" },
      { name: "Integrations", href: "#" },
    ],
  },
  {
    name: "Solutions",
    href: "#",
    subItems: [
      { name: "For Teams", href: "#" },
      { name: "For Individuals", href: "#" },
    ],
  },
  { name: "Pricing", href: "/pricing" },
  { name: "Blog", href: "/blog" },
  {
    name: "Resources",
    href: "#",
    subItems: [
      { name: "Docs", href: "#" },
      { name: "Support", href: "#" },
    ],
  },
  {
    name: "Company",
    href: "#",
    subItems: [
      { name: "About Us", href: "#" },
      { name: "Careers", href: "#" },
    ],
  },
]

export default function HeaderNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-[#0A192F]/80 backdrop-blur-md border-b border-gray-700/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <C9DLogo className="h-8 w-auto text-white" />
            </Link>
          </div>
          <nav className="hidden md:flex md:items-center md:space-x-2 lg:space-x-4">
            {navItems.map((item) =>
              item.subItems ? (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-sm font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white px-2 py-1 lg:px-3"
                    >
                      {item.name}
                      <ChevronDownIcon className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0A192F] border-gray-700 text-gray-200">
                    {item.subItems.map((subItem) => (
                      <DropdownMenuItem
                        key={subItem.name}
                        asChild
                        className="hover:bg-gray-700/50 focus:bg-gray-700/50"
                      >
                        <Link href={subItem.href}>{subItem.name}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white px-2 py-2 lg:px-3 rounded-md"
                >
                  {item.name}
                </Link>
              ),
            )}
          </nav>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              asChild
              className="hidden md:inline-flex text-gray-300 hover:bg-gray-700/50 hover:text-white"
            >
              <Link href="/sign-in">
                Sign In
              </Link>
            </Button>
            <Button 
              asChild
              className="hidden md:inline-flex bg-[#2CE4B8] text-[#0A192F] hover:bg-[#2CE4B8]/90 font-semibold"
            >
              <Link href="/sign-up">
                Sign Up
              </Link>
            </Button>
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:bg-gray-700/50 hover:text-white"
              >
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-700/50">
          <nav className="space-y-1 px-2 py-3 sm:px-3">
            {navItems.map((item) => (
              <div key={item.name}>
                {item.subItems ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white"
                      >
                        {item.name}
                        <ChevronDownIcon className="ml-auto h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[calc(100vw-2rem)] bg-[#0A192F] border-gray-700 text-gray-200">
                      {item.subItems.map((subItem) => (
                        <DropdownMenuItem
                          key={subItem.name}
                          asChild
                          className="hover:bg-gray-700/50 focus:bg-gray-700/50"
                        >
                          <Link href={subItem.href}>{subItem.name}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
            <div className="border-t border-gray-700 pt-4 mt-4 space-y-2">
              <Button
                variant="ghost"
                asChild
                className="w-full justify-start text-base font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/sign-in">
                  <UserIcon className="mr-2 h-5 w-5" /> Sign In
                </Link>
              </Button>
              <Button 
                asChild
                className="w-full bg-[#2CE4B8] text-[#0A192F] hover:bg-[#2CE4B8]/90 font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/sign-up">
                  Sign Up
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
