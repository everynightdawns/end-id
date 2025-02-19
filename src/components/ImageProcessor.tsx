'use client';

import React, { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ComfyResponse {
  promptID?: string;
  filename?: string;
  status?: string;
  error?: string;
  results?: {
    [key: string]: string[];
  };
  target?: string;
}

const ImageProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [resultImage, setResultImage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processImage(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      setError('Failed to access camera');
    }
  };

  const captureImage = async () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    
    const blob = await new Promise<Blob>((resolve) => 
      canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg')
    );
    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
    
    stopCamera();
    await processImage(file);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError('');
    setResultImage('');
    
    try {
      // Upload image
      const uploadFormData = new FormData();
      uploadFormData.append('action', 'upload');
      uploadFormData.append('image', file);
      
      const uploadResponse = await fetch('/api/comfyui', {
        method: 'POST',
        body: uploadFormData
      });
      
      const uploadData: ComfyResponse = await uploadResponse.json();
      if (!uploadData.filename) throw new Error('Upload failed');

      // Start workflow
      const promptFormData = new FormData();
      promptFormData.append('action', 'prompt');
      promptFormData.append('inputs', JSON.stringify({
        "3": {
          "inputs": {
            "image": uploadData.filename
          }
        }
      }));

      const promptResponse = await fetch('/api/comfyui', {
        method: 'POST',
        body: promptFormData
      });

      const promptData: ComfyResponse = await promptResponse.json();
      if (!promptData.promptID) throw new Error('Failed to start workflow');

      // Poll for results
      while (true) {
        const statusFormData = new FormData();
        statusFormData.append('action', 'status');
        statusFormData.append('promptId', promptData.promptID);
        
        const statusResponse = await fetch('/api/comfyui', {
          method: 'POST',
          body: statusFormData
        });
        
        const statusData: ComfyResponse = await statusResponse.json();
        
        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Processing failed');
        }
        
        if (statusData.status === 'done' && statusData.results) {
          const resultFilename = statusData.results['195']?.[0];
          if (!resultFilename) throw new Error('No result image found');
          
          // Get final image
          const viewFormData = new FormData();
          viewFormData.append('action', 'view');
          viewFormData.append('filename', resultFilename);
          
          const viewResponse = await fetch('/api/comfyui', {
            method: 'POST',
            body: viewFormData
          });
          
          const viewData: ComfyResponse = await viewResponse.json();
          if (!viewData.target) throw new Error('Failed to get result image URL');
          
          setResultImage(viewData.target);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <Button onClick={() => document.getElementById('fileInput')?.click()}>
              Upload Image
            </Button>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            
            <Button onClick={isCameraActive ? captureImage : startCamera}>
              <Camera className="w-4 h-4 mr-2" />
              {isCameraActive ? 'Capture' : 'Start Camera'}
            </Button>
            
            {isCameraActive && (
              <Button variant="destructive" onClick={stopCamera}>
                Stop Camera
              </Button>
            )}
          </div>

          {isCameraActive && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-video bg-black rounded-lg"
            />
          )}

          {isProcessing && (
            <div className="flex items-center justify-center p-4">
              <div className="w-8 h-8 border-4 border-t-blue-500 rounded-full animate-spin" />
              <span className="ml-2">Processing...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {resultImage && (
            <img
              src={resultImage}
              alt="Processed result"
              className="w-full rounded-lg shadow-lg"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageProcessor;