"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function DashboardDevicesPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (currentUser.status === "loading") return;
    if (currentUser.status === "authenticated" && currentUser.user.role === "admin") {
      router.replace("/admin/devices");
    } else {
      router.replace("/dashboard/vehicles");
    }
  }, [currentUser, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
