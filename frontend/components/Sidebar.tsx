import Link from "next/link";
import { useRouter } from "next/router";
import { LayoutDashboard, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

export default function Sidebar() {
  const router = useRouter();
  const { user } = useUser();

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      current: router.pathname === "/",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      current: router.pathname === "/settings",
    },
  ];

  const handleUserProfileClick = () => {
    router.push("/settings");
  };

  // Get user initials for avatar
  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex h-16 items-center justify-start px-6 border-b border-border">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/pax-logo.svg"
              alt="PAX Logo"
              width={80}
              height={40}
              className="w-full h-full object-contain"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const IconComponent = item.icon;
            return (
              <Button
                key={item.name}
                variant={item.current ? "default" : "ghost"}
                className="w-full justify-start space-x-3 cursor-pointer"
                onClick={() => {
                  router.push(item.href);
                }}
              >
                <IconComponent className="h-5 w-5" />
                <span>{item.name}</span>
              </Button>
            );
          })}
        </nav>

        <Separator />

        {/* User Profile */}
        <div className="p-4">
          <div
            className="flex items-center space-x-3 cursor-pointer hover:bg-accent transition-colors rounded-md p-2"
            onClick={handleUserProfileClick}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback>
                {user?.primaryEmailAddress?.emailAddress
                  ? getUserInitials(user.primaryEmailAddress.emailAddress)
                  : "US"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.fullName ||
                  user?.firstName ||
                  user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
                  "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.primaryEmailAddress?.emailAddress || "user@example.com"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
