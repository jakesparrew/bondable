
"use client"

import { ChevronRight } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ComponentType<{ className?: string }>
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("platform")}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon
          const hasSubItems = item.items && item.items.length > 0
          
          // If no subitems, render as a simple menu button
          if (!hasSubItems) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild
                  isActive={item.isActive}
                >
                  <button onClick={() => navigate(item.url)}>
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }
          
          // If has subitems, render as collapsible
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={item.isActive}>
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton 
                          asChild
                          isActive={location.pathname === subItem.url}
                        >
                          <button onClick={() => navigate(subItem.url)}>
                            <span>{subItem.title}</span>
                          </button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
