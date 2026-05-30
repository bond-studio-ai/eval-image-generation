import type { Metadata } from 'next';
import { NewInputPresetForm } from './new-input-preset-form';

export const metadata: Metadata = {
  title: 'New Input Preset',
  description: 'Create an input preset used to seed strategy runs.',
};

export default function NewInputPresetPage() {
  return <NewInputPresetForm />;
}
