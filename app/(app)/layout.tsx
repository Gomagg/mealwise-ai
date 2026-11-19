import { redirect } from "next/navigation";
import { currentUser, getPreferences } from "@/lib/store";
import { Sidebar } from "@/components/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const prefs = await getPreferences(user.id);
  if (!prefs?.onboarded) redirect("/onboarding");

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar name={prefs.displayName || user.email} plan={user.plan} />
      <main className="min-w-0 flex-1 px-4 pb-14 pt-16 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
