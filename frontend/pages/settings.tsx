import { useState } from "react";
import Layout from "../components/Layout";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserButton } from "@clerk/nextjs";
import { LogOut, User } from "lucide-react";

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      const names = name.split(" ");
      return names.length > 1
        ? (names[0][0] + names[1][0]).toUpperCase()
        : names[0].substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "US";
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.username) {
      return user.username;
    }
    if (user?.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress.split("@")[0];
    }
    return "User";
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Your basic account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.imageUrl || ""} />
                  <AvatarFallback className="text-lg">
                    {getUserInitials(
                      getDisplayName(),
                      user?.primaryEmailAddress?.emailAddress
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{getDisplayName()}</h3>
                  <p className="text-muted-foreground">
                    {user?.primaryEmailAddress?.emailAddress ||
                      "user@example.com"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user?.primaryEmailAddress?.emailAddress || "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Registration Date
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US")
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>
                Manage your account settings, security, and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Settings Section */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Profile Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Edit your profile, security settings, and preferences
                    </p>
                  </div>
                </div>
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-10 h-10",
                      userButtonBox: "scale-110",
                      userButtonPopoverCard: "shadow-lg",
                    },
                  }}
                  showName={false}
                />
              </div>

              <div className="text-xs text-muted-foreground bg-purple-50 p-3 rounded-md">
                <strong>Tip:</strong>
                {""} Click the user avatar on the right to manage your account
                settings, including password management, two-factor
                authentication, and more.
              </div>

              <Separator />

              {/* Logout Section */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Sign Out</h4>
                    <p className="text-sm text-muted-foreground">
                      Sign out of your account and return to the login page
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
