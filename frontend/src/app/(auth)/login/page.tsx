"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { Spinner } from "@/components/feedback/loaders";
import { FadeIn } from "@/components/feedback/motion";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { loginSchema, type LoginValues } from "@/lib/validators";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", pin: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values);
      toast.success("Welcome back!");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <FadeIn>
      <div className="mb-7 space-y-1.5 text-center lg:text-left">
        <h2 className="font-display text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in with your email or phone and 6-digit PIN.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="identifier">Email or phone</Label>
          <Input
            id="identifier"
            placeholder="you@example.com"
            autoComplete="username"
            {...register("identifier")}
          />
          {errors.identifier && (
            <p className="text-xs font-medium text-destructive">{errors.identifier.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>PIN</Label>
          <Controller
            control={control}
            name="pin"
            render={({ field }) => (
              <PinInput
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(errors.pin)}
                ariaLabel="Login PIN"
              />
            )}
          />
          {errors.pin && (
            <p className="text-xs font-medium text-destructive">{errors.pin.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting && <Spinner className="h-4 w-4" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Spend Jot?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </FadeIn>
  );
}
