const API_URL = '/api/serial-custom-templates';

export async function uploadTemplate(file) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(API_URL, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
}

export async function deleteTemplate(filename) {
  const response = await fetch(`${API_URL}?filename=${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
}

export async function listTemplates() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    return [];
  }
  return response.json();
}
