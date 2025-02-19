import { NextRequest, NextResponse } from 'next/server';

const WORKFLOW_ID = '0e123dd8-3cd1-43e8-8257-e4b5a1b4de88';
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI0eU56YzUzVUNOUVhIbmF5OVpvS1NaTW9vMEkzIiwiaWF0IjoxNzM5OTIyOTkyfQ.TBp6glGh5dGX6V2Ad53nUm_vJeqFN8EPDcBHOiGBAZA';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const action = formData.get('action') as string;

  try {
    let response;
    
    switch (action) {
      case 'upload':
        const image = formData.get('image');
        const uploadFormData = new FormData();
        uploadFormData.append('image', image as Blob);
        
        response = await fetch(`https://comfyai.run/api/service/upload/${WORKFLOW_ID}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          },
          body: uploadFormData
        });
        break;

      case 'prompt':
        const inputs = JSON.parse(formData.get('inputs') as string);
        response = await fetch(`https://comfyai.run/api/service/prompt/${WORKFLOW_ID}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(inputs)
        });
        break;

      case 'status':
        const promptId = formData.get('promptId') as string;
        response = await fetch(`https://comfyai.run/api/service/status/${promptId}`, {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });
        break;

      case 'view':
        const filename = formData.get('filename') as string;
        response = await fetch(`https://comfyai.run/api/service/view/${WORKFLOW_ID}?filename=${filename}`, {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}