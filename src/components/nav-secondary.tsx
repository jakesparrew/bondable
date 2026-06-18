
"use client"

import { useNavigate, useLocation } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: React.ComponentType<{ className?: string }>
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.url
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  size="sm"
                  isActive={isActive}
                >
                  <button onClick={() => navigate(item.url)}>
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
