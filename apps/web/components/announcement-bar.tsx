import Link from "next/link"

export default function AnnouncementBar() {
  // Simple state for dismissal, in a real app this might be stored in localStorage
  // For Next.js, we'll make it non-dismissible for simplicity or use a client component if state is needed.
  // This component is simple enough to be a server component without dismissal.

  return (
    <div className="bg-[#2CE4B8] text-[#0A192F] py-2 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto flex items-center justify-between">
        <p className="text-sm font-medium text-center flex-grow">
          Introducing the new C9N.AI platform - built for limitless insights.{" "}
          <Link href="/learn-more" className="font-bold underline hover:opacity-80">
            LEARN MORE
          </Link>
        </p>
        {/* <Button variant="ghost" size="sm" className="text-[#0A192F] hover:bg-teal-400/50 -mr-2">
          <XIcon className="h-5 w-5" />
          <span className="sr-only">Dismiss</span>
        </Button> */}
      </div>
    </div>
  )
}
