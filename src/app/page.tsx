import ImageProcessor from '@/components/ImageProcessor';

export default function Home() {
  return (
    <main className="container p-8">
      <h1 className="text-2xl font-bold mb-4">Image Processor</h1>
      <ImageProcessor />
    </main>
  );
}