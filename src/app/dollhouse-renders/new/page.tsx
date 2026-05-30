import type { Metadata } from "next";
import { NewRenderForm } from "./new-render-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Dollhouse Render",
  description: "Create a new dollhouse render."
};

export default function NewDollhouseRenderPage() {
  return <NewRenderForm />;
}
