'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderOpen,
  Cloud,
  Settings,
  HardDrive,
  Home,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  Database,
  Tags,
  Upload,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    title: 'Home',
    icon: Home,
    href: '/',
  },
  {
    title: 'Local Files',
    icon: HardDrive,
    href: '/local',
  },
  {
    title: 'Google Drive',
    icon: Cloud,
    href: '/google-drive',
  },
  {
    title: 'Naming Config',
    icon: FileText,
    href: '/naming-config',
  },
  {
    title: 'Naming Test',
    icon: FlaskConical,
    href: '/naming-test',
  },
  {
    title: 'File Metadata',
    icon: Database,
    href: '/file-metadata',
  },
  {
    title: 'Naming Conventions',
    icon: Tags,
    href: '/naming-conventions',
  },
  {
    title: 'Upload & Extract',
    icon: Upload,
    href: '/upload-extract',
  },
  {
    title: 'LLM API',
    icon: Bot,
    href: '/llm-api',
  },
  {
    title: 'Prompts',
    icon: MessageSquare,
    href: '/prompts',
  },
];

const bottomItems = [
  {
    title: 'Settings',
    icon: Settings,
    href: '/settings',
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-sidebar-primary" />
              <span className="font-semibold text-sidebar-foreground">Hazo Files</span>
            </div>
          )}
          {collapsed && (
            <FolderOpen className="h-6 w-6 text-sidebar-primary mx-auto" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        size="icon"
                        className={cn(
                          'w-full justify-center',
                          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Bottom items */}
        <div className="p-2 space-y-1">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        size="icon"
                        className="w-full justify-center"
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start gap-3"
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
