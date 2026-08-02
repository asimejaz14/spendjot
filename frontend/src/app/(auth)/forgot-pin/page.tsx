"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Spinner } from "@/components/feedback/loaders";
import { FadeIn } from "@/components/feedback/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { getErrorMessage, setAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useForgotPin, useResetPin } from "@/lib/queries";
import {
  forgotPinSchema,
  resetPinSchema,
  type ForgotPinValues,
  type ResetPinValues,
} from "@/lib/validators";

export default function ForgotPinPage() {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");

  return (
    <FadeIn>
      {step === "request" ? (
        <RequestStep
          onSent={(e) => {
            setEmail(e);
            setStep("verify");
          }}
        />
      ) : (
        <VerifyStep email={email} onBack={() => setStep("request")} />
      )}
    </FadeIn>
  );
}

function RequestStep({ onSent }: { onSent: (email: string) => void }) {
  const forgotPin = useForgotPin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPinValues>({
    resolver: zodResolver(forgotPinSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPinValues) => {
    try {
      await forgotPin.mutateAsync(values.email);
      toast.success("If an account exists for that email, we've sent a code.");
      onSent(values.email);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="mb-7 space-y-1.5 text-center lg:text-left">
        <h2 className="font-display text-2xl font-bold tracking-tight">Forgot your PIN?</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a 6-digit code to reset it.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="h-4 w-4" />}
          Send reset code
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

function VerifyStep({ email, onBack }: { email: string; onBack: () => void }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const resetPin = useResetPin();
  const forgotPin = useForgotPin();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPinValues>({
    resolver: zodResolver(resetPinSchema),
    defaultValues: { code: "", new_pin: "", confirm_pin: "" },
  });

  const onSubmit = async (values: ResetPinValues) => {
    try {
      const { access_token } = await resetPin.mutateAsync({
        email,
        code: values.code,
        new_pin: values.new_pin,
      });
      setAccessToken(access_token);
      await refreshUser();
      toast.success("Your PIN has been reset.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const resend = async () => {
    try {
      await forgotPin.mutateAsync(email);
      toast.success("We've sent a new code.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="mb-7 space-y-1.5 text-center lg:text-left">
        <h2 className="font-display text-2xl font-bold tracking-tight">Reset your PIN</h2>
        <p className="text-sm text-muted-foreground">
          Enter the code sent to <span className="font-medium text-foreground">{email}</span> and
          choose a new PIN.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <PinField label="6-digit code" name="code" control={control} error={errors.code?.message} />
        <PinField label="New PIN" name="new_pin" control={control} error={errors.new_pin?.message} />
        <PinField
          label="Confirm new PIN"
          name="confirm_pin"
          control={control}
          error={errors.confirm_pin?.message}
        />

        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="h-4 w-4" />}
          Reset PIN
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Change email
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={forgotPin.isPending}
          className="font-semibold text-primary hover:underline disabled:opacity-50"
        >
          Resend code
        </button>
      </div>
    </>
  );
}

function PinField({
  label,
  name,
  control,
  error,
}: {
  label: string;
  name: keyof ResetPinValues;
  control: ReturnType<typeof useForm<ResetPinValues>>["control"];
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <PinInput
            value={field.value}
            onChange={field.onChange}
            invalid={Boolean(error)}
            ariaLabel={label}
          />
        )}
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
