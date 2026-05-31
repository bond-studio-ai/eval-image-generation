"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "@/components/ui/icons";
import { toast } from "@/components/ui/toaster";
import { serviceUrl } from "@/lib/api-base";

export function CloneButton({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClone = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(serviceUrl(`strategies/${strategyId}/clone`), { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to clone strategy", {
          description: `Server responded with ${res.status}.`
        });
        return;
      }
      const json = await res.json();
      const newId = json.data?.id;
      if (newId) {
        toast.success("Strategy cloned");
        router.push(`/strategies/${newId}`);
      }
    } catch (error) {
      toast.error("Failed to clone strategy", error instanceof Error ? { description: error.message } : {});
    } finally {
      setLoading(false);
    }
  }, [strategyId, router]);

  return (
    <Button variant="secondary" onClick={handleClone} loading={loading} iconLeft={<CopyIcon className="size-4" />}>
      {loading ? "Cloning…" : "Clone"}
    </Button>
  );
}
