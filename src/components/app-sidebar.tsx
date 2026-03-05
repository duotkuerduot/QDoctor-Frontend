"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconHelp,
  IconInnerShadowTop,
  IconMessage,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/provider/auth-provider"

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconMessage,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconMessage,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconMessage,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session, isAuthenticated, openAuthModal } = useAuth()
  const metadata = (session?.user.user_metadata ?? {}) as {
    first_name?: string
    last_name?: string
  }
  const firstName = (metadata.first_name ?? "").trim()
  const lastName = (metadata.last_name ?? "").trim()
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const fallbackInitials = session?.user.email?.slice(0, 2).toUpperCase() ?? "QD"
  const userName = lastName ? `Dr. ${lastName}` : "Dr."

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">QDoctor AI</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {isAuthenticated && session?.user ? (
          <NavUser
            user={{
              name: userName,
              email: session.user.email ?? "",
              initials: initials || fallbackInitials,
            }}
          />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => openAuthModal("login")}
              >
                Log In
              </Button>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Button
                type="button"
                className="w-full"
                onClick={() => openAuthModal("signup")}
              >
                Sign Up
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
