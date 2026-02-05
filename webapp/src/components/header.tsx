'use client'

import { ConnectKitButton } from "connectkit"
import Image from "next/image"
import Link from "next/link"

export function Header() {
  return (
    <div className="flex justify-between items-center p-4">
      <Link href="/">
        <Image src="/next.svg" alt="Logo" width={100} height={100} />
      </Link>
      <ConnectKitButton />
    </div>
  )
}