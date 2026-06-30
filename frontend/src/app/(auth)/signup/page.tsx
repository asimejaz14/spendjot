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
import { signupSchema, type SignupValues } from "@/lib/validators";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", phone: "", display_name: "", pin: "", confirm_pin: "" },
  });

  const onSubmit = async (values: SignupValues) => {
    try {
      await signup(values);
      toast.success("Account created — welcome to Spend Jot!");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <FadeIn>
      <div className="mb-7 space-y-1.5 text-center lg:text-left">
        <h2 className="font-display text-2xl font-bold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground">
          Takes a few seconds. You&apos;ll log in with a 6-digit PIN.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="display_name">
            Name <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="display_name" placeholder="Asim" {...register("display_name")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Phone <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+92 300 1234567"
            autoComplete="tel"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs font-medium text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Choose a 6-digit PIN</Label>
          <Controller
            control={control}
            name="pin"
            render={({ field }) => (
              <PinInput
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(errors.pin)}
                ariaLabel="New PIN"
              />
            )}
          />
          {errors.pin && (
            <p className="text-xs font-medium text-destructive">{errors.pin.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Confirm PIN</Label>
          <Controller
            control={control}
            name="confirm_pin"
            render={({ field }) => (
              <PinInput
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(errors.confirm_pin)}
                ariaLabel="Confirm PIN"
              />
            )}
          />
          {errors.confirm_pin && (
            <p className="text-xs font-medium text-destructive">{errors.confirm_pin.message}</p>
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
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </FadeIn>
  );
}
