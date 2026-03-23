'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { type ChangeEvent, type DragEvent, useCallback, useRef } from 'react';

export function FileDropRow(props: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { id, label, accept, file, onFile, disabled } = props;

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const pickFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || disabled) return;
      const arr = Array.from(list as FileList);
      const first = arr[0];
      if (first) onFile(first);
    },
    [disabled, onFile],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      pickFiles(e.dataTransfer.files);
    },
    [pickFiles],
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      pickFiles(e.target.files);
      e.target.value = '';
    },
    [pickFiles],
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            accept={accept}
            className="hidden"
            disabled={disabled}
            id={id}
            onChange={onChange}
            ref={inputRef}
            type="file"
          />
          <Button
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Upload className="mr-1.5 size-3.5" />
            Choose file
          </Button>
          <span className="text-xs">or drag and drop here</span>
        </div>
        {file ? (
          <p className="truncate text-xs font-medium text-foreground">
            Selected: {file.name}
          </p>
        ) : (
          <p className="text-xs">No file selected</p>
        )}
      </div>
    </div>
  );
}
