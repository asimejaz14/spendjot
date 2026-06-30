"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FadeIn } from "@/components/feedback/motion";
import { Spinner } from "@/components/feedback/loaders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useChangePin, useUpdateProfile } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ThemePref } from "@/lib/types";
import { changePinSchema, type ChangePinValues } from "@/lib/validators";

const THEMES: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, theme and PIN.</p>
      </header>
      <FadeIn>
        <ProfileCard />
      </FadeIn>
      <FadeIn delay={0.05}>
        <AppearanceCard />
      </FadeIn>
      <FadeIn delay={0.1}>
        <SecurityCard />
      </FadeIn>
    </div>
  );
}

function ProfileCard() {
  const { user, setUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(user?.display_name ?? "");

  useEffect(() => setName(user?.display_name ?? ""), [user?.display_name]);

  const save = async () => {
    try {
      const updated = await updateProfile.mutateAsync({ display_name: name.trim() || null });
      setUser(updated);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={user?.phone ?? "—"} disabled />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={updateProfile.isPending}>
            {updateProfile.isPending && <Spinner className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const { user, setUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = (mounted ? theme : user?.theme) as ThemePref | undefined;

  const choose = async (value: ThemePref) => {
    setTheme(value);
    try {
      const updated = await updateProfile.mutateAsync({ theme: value });
      setUser(updated);
    } catch {
      /* theme still applied locally; ignore persistence error */
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how Spend Jot looks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ value, label, icon: Icon }) => {
            const active = current === value;
            return (
              <button
                key={value}
                onClick={() => choose(value)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all",
                  active
                    ? "border-primary bg-secondary text-secondary-foreground shadow-soft"
                    : "border-border hover:bg-accent",
                )}
                aria-pressed={active}
              >
                {active && (
                  <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />
                )}
                <Icon className="h-6 w-6" />
                {label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityCard() {
  const changePin = useChangePin();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePinValues>({
    resolver: zodResolver(changePinSchema),
    defaultValues: { current_pin: "", new_pin: "", confirm_pin: "" },
  });

  const onSubmit = async (values: ChangePinValues) => {
    try {
      await changePin.mutateAsync({
        current_pin: values.current_pin,
        new_pin: values.new_pin,
      });
      toast.success("Your PIN has been updated.");
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change PIN</CardTitle>
        <CardDescription>Use a new 6-digit PIN to sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <PinField
            label="Current PIN"
            name="current_pin"
            control={control}
            error={errors.current_pin?.message}
          />
          <PinField
            label="New PIN"
            name="new_pin"
            control={control}
            error={errors.new_pin?.message}
          />
          <PinField
            label="Confirm new PIN"
            name="confirm_pin"
            control={control}
            error={errors.confirm_pin?.message}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={changePin.isPending}>
              {changePin.isPending && <Spinner className="h-4 w-4" />}
              Update PIN
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PinField({
  label,
  name,
  control,
  error,
}: {
  label: string;
  name: keyof ChangePinValues;
  control: ReturnType<typeof useForm<ChangePinValues>>["control"];
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="max-w-sm">
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
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
