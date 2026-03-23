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
import { FileAudio } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FileDropRow } from './FileDropRow';

const SAMPLE_AUDIO_URL = 'https://cdn.openai.com/API/docs/audio/alloy.wav';

const formSchema = z.object({
  model: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

type AnyGenerateResult = GenerateTextResult<any, any>;

export default function FilesAudioView() {
  const { apiKey } = usePollinationsApiKey();
  const models = useTextModels();
  const resultRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { model: 'gemini-fast' },
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPrompt, setAudioPrompt] = useState(
    'Briefly describe what you hear in this audio clip.',
  );

  const [audioResult, setAudioResult] = useState<AnyGenerateResult | null>(
    null,
  );
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState('');

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

  const runAudio = async () => {
    setAudioLoading(true);
    setAudioError('');
    setAudioResult(null);
    try {
      const pollinations = createPollinations({ apiKey: apiKey || undefined });
      const model = pollinations(modelId);

      const filePart = audioFile
        ? {
            type: 'file' as const,
            data: new Uint8Array(await audioFile.arrayBuffer()),
            mediaType: audioFile.type || 'audio/wav',
            filename: audioFile.name,
          }
        : {
            type: 'file' as const,
            data: new URL(SAMPLE_AUDIO_URL),
            mediaType: 'audio/wav',
            filename: 'sample.wav',
          };

      const result = await generateText({
        model,
        system:
          'You are a helpful assistant. Answer based on the attached audio when present.',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: audioPrompt }, filePart],
          },
        ],
      });
      setAudioResult(result);
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setAudioLoading(false);
    }
  };

  return (
    <TwoPaneView
      resultRef={resultRef}
      leftPane={
        <Form {...form}>
          <div className="space-y-6">
            <PageHeader
              title="Audio"
              subtitle="Generate with a built-in sample audio by default, or drop your own file to replace it."
            />

            <ModelSelector
              description="Models differ in audio support; Gemini-style routes often work best."
              disabled={audioLoading}
              form={form}
              models={models}
              name="model"
            />

            <Card className={'gap-4'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileAudio className="size-4" />
                  Audio input
                </CardTitle>
                <CardDescription>
                  WAV/MP3 file input. If no file is selected, sample WAV URL is
                  used.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="audio-prompt">Prompt</Label>
                  <Textarea
                    disabled={audioLoading}
                    id="audio-prompt"
                    onChange={(e) => setAudioPrompt(e.target.value)}
                    rows={3}
                    value={audioPrompt}
                  />
                </div>
                <FileDropRow
                  accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp3,.wav,.mp3"
                  disabled={audioLoading}
                  file={audioFile}
                  id="audio-file"
                  label="Audio file"
                  onFile={setAudioFile}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={audioLoading}
                    onClick={runAudio}
                    type="button"
                  >
                    {audioLoading ? 'Running…' : 'Generate'}
                  </Button>
                </div>
                <ErrorAlert message={audioError} />
              </CardContent>
            </Card>
          </div>
        </Form>
      }
      rightPane={
        <GenerateTextResultPanel
          placeholderText="Run an audio request to see the model response."
          response={audioResult}
        />
      }
    />
  );
}
