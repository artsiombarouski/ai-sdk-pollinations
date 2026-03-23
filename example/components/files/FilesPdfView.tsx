'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import { ModelSelector } from '@/components/ModelSelector';
import { useTextModels } from '@/components/ModelsProvider';
import { PageHeader } from '@/components/PageHeader';
import { usePollinationsApiKey } from '@/components/PollinationsApiKeyProvider';
import { TwoPaneView } from '@/components/TwoPaneView';
import { GenerateTextResultPanel } from '@/components/text-generation/GenerateTextResultPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateText, type GenerateTextResult } from 'ai';
import { createPollinations } from 'ai-sdk-pollinations';
import { FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FileDropRow } from './FileDropRow';

/** Same-origin asset (see `example/public/assets/`) */
const SAMPLE_PDF_PATH = '/assets/pdflatex-4-pages.pdf';

const formSchema = z.object({
  model: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

type AnyGenerateResult = GenerateTextResult<any, any>;

export default function FilesPdfView() {
  const { apiKey } = usePollinationsApiKey();
  const models = useTextModels();
  const resultRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { model: 'gemini-fast' },
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPrompt, setPdfPrompt] = useState(
    'Summarize this PDF in a short paragraph. Mention how many pages it has if you can tell.',
  );

  const [pdfResult, setPdfResult] = useState<AnyGenerateResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

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

  const runPdf = async () => {
    setPdfLoading(true);
    setPdfError('');
    setPdfResult(null);
    try {
      const pollinations = createPollinations({ apiKey: apiKey || undefined });
      const model = pollinations(modelId);

      const filePart = pdfFile
        ? {
            type: 'file' as const,
            data: new Uint8Array(await pdfFile.arrayBuffer()),
            mediaType: pdfFile.type || 'application/pdf',
            filename: pdfFile.name,
          }
        : {
            type: 'file' as const,
            data: new URL(
              SAMPLE_PDF_PATH,
              typeof window !== 'undefined'
                ? window.location.origin
                : 'http://localhost:3000',
            ),
            mediaType: 'application/pdf',
            filename: 'pdflatex-4-pages.pdf',
          };

      const result = await generateText({
        model,
        system:
          'You are a helpful assistant. Answer based on the attached document when present.',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: pdfPrompt }, filePart],
          },
        ],
      });
      setPdfResult(result);
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <TwoPaneView
      resultRef={resultRef}
      leftPane={
        <Form {...form}>
          <div className="space-y-6">
            <PageHeader
              title="PDF"
              subtitle="Generate with a built-in sample PDF by default, or drop your own PDF to replace it."
            />

            <ModelSelector
              description="Models differ in PDF support; Gemini-style routes often work best."
              disabled={pdfLoading}
              form={form}
              models={models}
              name="model"
            />

            <Card className={'gap-4'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  PDF input
                </CardTitle>
                <CardDescription>
                  Local sample: pdflatex 4-page PDF from{' '}
                  <code className="text-xs">{SAMPLE_PDF_PATH}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdf-prompt">Prompt</Label>
                  <Textarea
                    disabled={pdfLoading}
                    id="pdf-prompt"
                    onChange={(e) => setPdfPrompt(e.target.value)}
                    rows={3}
                    value={pdfPrompt}
                  />
                </div>
                <FileDropRow
                  accept="application/pdf,.pdf"
                  disabled={pdfLoading}
                  file={pdfFile}
                  id="pdf-file"
                  label="PDF file"
                  onFile={setPdfFile}
                />
                <div className="flex flex-wrap gap-2">
                  <Button disabled={pdfLoading} onClick={runPdf} type="button">
                    {pdfLoading ? 'Running…' : 'Generate'}
                  </Button>
                </div>
                <ErrorAlert message={pdfError} />
              </CardContent>
            </Card>
          </div>
        </Form>
      }
      rightPane={
        <GenerateTextResultPanel
          placeholderText="Run a PDF request to see the model response."
          response={pdfResult}
        />
      }
    />
  );
}
