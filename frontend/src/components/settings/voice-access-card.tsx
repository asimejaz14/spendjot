"use client";

import {
  Check,
  ChevronDown,
  Copy,
  Mic,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/feedback/loaders";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { getErrorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function VoiceAccessCard() {
  const { data: tokens, isLoading } = useApiTokens();
  const createToken = useCreateApiToken();
  const revokeToken = useRevokeApiToken();

  const [fresh, setFresh] = useState<string | null>(null); // plaintext shown once
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const [endpoint, setEndpoint] = useState("");
  useEffect(() => {
    setEndpoint(`${window.location.origin}/api/v1/voice/expense`);
  }, []);

  const generate = async () => {
    try {
      const created = await createToken.mutateAsync("Siri Shortcut");
      setFresh(created.token);
      setCopied(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Couldn't copy — select and copy it manually.");
    }
  };

  const revoke = async () => {
    if (!revokeId) return;
    try {
      await revokeToken.mutateAsync(revokeId);
      toast.success("Token revoked.");
      setRevokeId(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <SpotlightCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" /> Voice access
        </CardTitle>
        <CardDescription>
          Add expenses by talking to Siri — just say &ldquo;Hey Siri, add
          expense&rdquo;. Generate a token, paste it into the Shortcut once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Freshly-created token — shown exactly once */}
        {fresh && (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-brand-soft p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <TriangleAlert className="h-4 w-4" />
              Copy this now — you won&apos;t be able to see it again.
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2 font-mono text-sm">
                {fresh}
              </code>
              <Button size="sm" variant={copied ? "secondary" : "brand"} onClick={() => copy(fresh)}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <button
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setFresh(null)}
            >
              Done
            </button>
          </div>
        )}

        {/* Existing tokens */}
        {isLoading ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : tokens && tokens.length > 0 ? (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="tnum truncate text-xs text-muted-foreground">
                    {t.prefix}…·{" "}
                    {t.last_used_at ? `used ${timeAgo(t.last_used_at)}` : "never used"}
                  </p>
                </div>
                <button
                  aria-label="Revoke token"
                  onClick={() => setRevokeId(t.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No tokens yet.</p>
        )}

        <Button variant="outline" onClick={generate} disabled={createToken.isPending}>
          {createToken.isPending ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          Generate token
        </Button>

        {/* Collapsible setup steps */}
        <div className="rounded-xl border border-border">
          <button
            onClick={() => setShowSteps((s) => !s)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
          >
            How to set up Siri
            <ChevronDown className={cn("h-4 w-4 transition-transform", showSteps && "rotate-180")} />
          </button>
          {showSteps && (
            <div className="space-y-2 border-t border-border px-3 py-3 text-sm text-muted-foreground">
              <ol className="list-decimal space-y-1.5 pl-4">
                <li>Open the <strong>Shortcuts</strong> app → new shortcut named <strong>Add expense</strong>.</li>
                <li>Add <strong>Dictate Text</strong>.</li>
                <li>
                  Add <strong>Get Contents of URL</strong> → <strong>POST</strong> to:
                  <code className="mt-1 block break-all rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                    {endpoint || "…/api/v1/voice/expense"}
                  </code>
                </li>
                <li>
                  Header <code className="font-mono text-xs">Authorization</code> ={" "}
                  <code className="font-mono text-xs">Bearer &lt;your token&gt;</code>.
                </li>
                <li>
                  JSON body: <code className="font-mono text-xs">text</code> = Dictated Text,{" "}
                  <code className="font-mono text-xs">client_now</code> = Current Date,{" "}
                  <code className="font-mono text-xs">client_tz</code> = your timezone.
                </li>
                <li>Add <strong>Speak Text</strong> using the <code className="font-mono text-xs">spoken</code> value from the response.</li>
                <li>Turn on &ldquo;Hey Siri&rdquo; for the shortcut. Done!</li>
              </ol>
            </div>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={revokeId !== null}
        onOpenChange={(o) => !o && setRevokeId(null)}
        title="Revoke this token?"
        description="Any Shortcut using it will stop working until you paste in a new one."
        confirmLabel="Revoke"
        destructive
        loading={revokeToken.isPending}
        onConfirm={revoke}
      />
    </SpotlightCard>
  );
}
