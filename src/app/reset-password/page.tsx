import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ from?: string; error?: string }> }) {
  const params = await searchParams;
  return <AuthPageLayout><ResetPasswordForm fromEmail={params.from === "email"} linkExpired={params.error === "expired"} /></AuthPageLayout>;
}
