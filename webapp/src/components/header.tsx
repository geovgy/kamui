'use client'

import { ConnectKitButton } from "connectkit"
import Image from "next/image"
import Link from "next/link"

export function Header() {
  return (
    <div className="flex justify-between items-center p-4">
      <div className="flex items-center gap-6">
        <Link href="/">
          <Image src="/next.svg" alt="Logo" width={100} height={100} />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Assets
          </Link>
          <Link href="/wormholes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Wormhole Transfers
          </Link>
        </nav>
      </div>
      <ConnectKitButton />
    </div>
  )
}