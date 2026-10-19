const form = document.querySelector('#verification-form');
const key = document.querySelector('#verification-key');
const proof = document.querySelector('#proof');
const inputs = document.querySelector('#public-inputs');
const status = document.querySelector('#status');
const panel = document.querySelector('#calldata-panel');
const calldata = document.querySelector('#calldata');
let revision = 0;
function show(state, message) { status.dataset.state = state; status.textContent = message; panel.hidden = true; calldata.textContent = ''; }
function busy(value) { for (const button of document.querySelectorAll('button')) button.disabled = value; }
for (const field of [key, proof, inputs]) field.addEventListener('input', () => { revision++; show('ready', 'Inputs changed. Verify again.'); });
async function loadExample(name) {
  const started = ++revision; busy(true); show('pending', 'Loading example...');
  try {
    const response = await fetch('/examples/' + name + '.json');
    if (!response.ok) throw new Error('Example could not be loaded.');
    const data = await response.json();
    if (started !== revision) return;
    key.value = JSON.stringify(data.verifyingKey, null, 2); proof.value = JSON.stringify(data.proof, null, 2); inputs.value = JSON.stringify(data.publicInputs);
    show('ready', 'Example loaded. Select Verify proof.');
  } catch (error) { if (started === revision) show('error', error.message); }
  finally { busy(false); }
}
document.querySelector('#load-normal').addEventListener('click', () => loadExample('normal'));
document.querySelector('#load-zero').addEventListener('click', () => loadExample('zero'));
form.addEventListener('submit', async event => {
  event.preventDefault(); const started = revision; busy(true); show('pending', 'Verifying proof...');
  try {
    let body;
    try { body = { verifyingKey: JSON.parse(key.value), proof: JSON.parse(proof.value), publicInputs: JSON.parse(inputs.value) }; }
    catch { throw new Error('Enter valid JSON in all three fields.'); }
    const response = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (started !== revision) { show('ready', 'Inputs changed. Verify again.'); return; }
    if (!response.ok) throw new Error(result.error || 'Verification failed.');
    show(result.valid ? 'valid' : 'invalid', result.message);
    if (result.valid) { calldata.textContent = JSON.stringify(result.calldata, null, 2); panel.hidden = false; }
  } catch (error) { if (started === revision) show('error', error.message); }
  finally { busy(false); }
});
