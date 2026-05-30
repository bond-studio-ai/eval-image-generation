import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { StrategiesTable } from "./strategies-table";

export const metadata: Metadata = {
  title: "Strategies",
  description: "Multi-step workflows that chain generations together."
};

export const dynamic = "force-dynamic";

export default function StrategiesPage() {
  return (
    <div>
      <PageHeader
        title="Strategies"
        subtitle="Multi-step workflows that chain generations together."
        actions={
          <LinkButton href="/strategies/new" iconLeft={<PlusIcon className="size-4" />}>
            New Strategy
          </LinkButton>
        }
      />
      <StrategiesTable />
    </div>
  );
}
