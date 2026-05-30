import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { DollhouseRendersTable } from "./dollhouse-renders-table";

export const metadata: Metadata = {
  title: "Dollhouse Renders",
  description: "Browse standalone dollhouse renders and submit new ones for a project."
};

export const dynamic = "force-dynamic";

export default function DollhouseRendersPage() {
  return (
    <div>
      <PageHeader
        title="Dollhouse Renders"
        subtitle="Browse standalone dollhouse renders and submit new ones for a project."
        actions={
          <LinkButton href="/dollhouse-renders/new" variant="primary" iconLeft={<PlusIcon className="size-4" />}>
            New Render
          </LinkButton>
        }
      />
      <DollhouseRendersTable />
    </div>
  );
}
