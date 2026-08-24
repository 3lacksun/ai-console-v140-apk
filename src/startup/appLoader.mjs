const normaliseError = (error) => {
  const message = String(error?.message || 'Application module failed to load.').split('\n')[0].trim();
  return message.slice(0, 180) || 'Application module failed to load.';
};

export async function loadApplicationModule(loader) {
  if (typeof loader !== 'function') return { ok: false, status: 'UNAVAILABLE', error: 'Application loader is unavailable.' };
  try {
    const loaded = await loader();
    const component = loaded?.default || loaded;
    if (!component) return { ok: false, status: 'UNAVAILABLE', error: 'Application module did not export a component.' };
    return { ok: true, status: 'READY', component };
  } catch (error) {
    return { ok: false, status: 'UNAVAILABLE', error: normaliseError(error) };
  }
}
