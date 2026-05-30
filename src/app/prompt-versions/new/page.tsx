import type { Metadata } from 'next';
import { NewPromptVersionForm } from './new-prompt-version-form';

export const metadata: Metadata = {
  title: 'New Prompt Version',
  description: 'Create a new prompt version template.',
};

export default function NewPromptVersionPage() {
  return <NewPromptVersionForm />;
}
