import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <Construction className="size-12 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">
            {title || 'Under Construction'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This page is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
