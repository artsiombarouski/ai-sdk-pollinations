'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import { ModelSelector } from '@/components/ModelSelector';
import { useTextModels } from '@/components/ModelsProvider';
import { PageHeader } from '@/components/PageHeader';
import { usePollinationsApiKey } from '@/components/PollinationsApiKeyProvider';
import { TwoPaneView } from '@/components/TwoPaneView';
import { GenerateTextResultPanel } from '@/components/text-generation/GenerateTextResultPanel';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateText, type GenerateTextResult } from 'ai';
import { createPollinations } from 'ai-sdk-pollinations';
import { Image } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FileDropRow } from './FileDropRow';

/** Stable PNG for URL-based demo (no local asset required). */
const SAMPLE_IMAGE_URL =
  'https://images.unsplash.com/photo-1761839256951-10c4468c3621?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const formSchema = z.object({
  model: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

type AnyGenerateResult = GenerateTextResult<any, any>;

export default function FilesImageView() {
  const { apiKey } = usePollinationsApiKey();
  const models = useTextModels();
  const resultRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { model: 'gemini-fast' },
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePrompt, setImagePrompt] = useState(
    'Describe this image briefly: main subjects, colors, and any text you can read.',
  );

  const [imageResult, setImageResult] = useState<AnyGenerateResult | null>(
    null,
  );
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const activePreviewUrl = imagePreviewUrl ?? SAMPLE_IMAGE_URL;

  const modelId = form.watch('model');

  useEffect(() => {
    if (
      models.length > 0 &&
      !models.find((m) => m.id === modelId) &&
      models[0]
    ) {
      form.setValue('model', models[0].id);
    }
  }, [models, modelId, form]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const runImage = async () => {
    setImageLoading(true);
    setImageError('');
    setImageResult(null);
    try {
      const pollinations = createPollinations({ apiKey: apiKey || undefined });
      const model = pollinations(modelId);

      const filePart = imageFile
        ? {
            type: 'file' as const,
            data: new Uint8Array(await imageFile.arrayBuffer()),
            mediaType:
              imageFile.type && imageFile.type.startsWith('image/')
                ? imageFile.type
                : 'image/jpeg',
            filename: imageFile.name,
          }
        : {
            type: 'file' as const,
            data: new URL(SAMPLE_IMAGE_URL),
            mediaType: 'image/png',
            filename: 'sample.png',
          };

      const result = await generateText({
        model,
        system:
          'You are a helpful assistant. Answer based on the attached image when present.',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: imagePrompt }, filePart],
          },
        ],
      });
      setImageResult(result);
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <TwoPaneView
      resultRef={resultRef}
      leftPane={
        <Form {...form}>
          <div className="space-y-6">
            <PageHeader
              title="Image"
              subtitle="Generate with a built-in sample image by default, or drop your own image to replace it."
            />

            <ModelSelector
              description="Vision-capable models can read image attachments."
              disabled={imageLoading}
              form={form}
              models={models}
              name="model"
            />

            <Card className={'gap-4'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Image className="size-4" />
                  Image input
                </CardTitle>
                <CardDescription>
                  JPEG, PNG, or WebP file input. If no file is selected, sample
                  image URL is used.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image-prompt">Prompt</Label>
                  <Textarea
                    disabled={imageLoading}
                    id="image-prompt"
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={3}
                    value={imagePrompt}
                  />
                </div>
                <FileDropRow
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  disabled={imageLoading}
                  file={imageFile}
                  id="image-file"
                  label="Image file"
                  onFile={setImageFile}
                />
                <div className="space-y-2">
                  <Label>{imageFile ? 'Preview' : 'Sample preview'}</Label>
                  <div className="overflow-hidden rounded-md border bg-muted/40">
                    <img
                      alt={imageFile?.name || 'Sample image preview'}
                      className="max-h-72 w-full object-contain"
                      src={activePreviewUrl}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={imageLoading}
                    onClick={runImage}
                    type="button"
                  >
                    {imageLoading ? 'Running…' : 'Generate'}
                  </Button>
                </div>
                <ErrorAlert message={imageError} />
              </CardContent>
            </Card>
          </div>
        </Form>
      }
      rightPane={
        <GenerateTextResultPanel
          placeholderText="Run an image request to see the model response."
          response={imageResult}
        />
      }
    />
  );
}
