import type * as React from 'react';

export interface ResultImage {
  id: string;
  url: string;
}

export interface ProductImageGroup {
  key: string;
  label: string;
  urls: string[];
}

export interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}
