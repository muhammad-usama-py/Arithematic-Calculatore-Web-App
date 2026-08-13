const input = document.getElementById('input');
const display = document.getElementById('display');
const indicator = document.getElementById('indicator');
const historyEl = document.getElementById('history');
const explanationEl = document.getElementById('explanation');
const provenanceEl = document.getElementById('provenance');
const whyBtn = document.getElementById('why-btn');
const whyPanel = document.createElement('div');
whyPanel.id = 'why-panel';
whyPanel.className = 'panel';
whyPanel.style.display = 'none';
provenanceEl.parentNode.insertBefore(whyPanel, provenanceEl.nextSibling);
const calculateBtn = document.getElementById('calculate');
const clearBtn = document.getElementById('clear');
const usePreviousBtn = document.getElementById('use-previous');

let lastCalculationId = null;
let history = [];

function setDisplay(text, isExact) {
  display.textContent = text;
  indicator.textContent = isExact ? 'Exact' : 'Approximate (rounded)';
}

function renderHistory() {
  historyEl.innerHTML = '';
  history.slice().reverse().forEach((h) => {
    const li = document.createElement('li');
    li.textContent = `${h.expression} = ${h.display_value}`;
    li.onclick = async () => {
      // fetch details
      const resp = await fetch(`/api/history/${h.calculation_id}`);
      if (!resp.ok) return;
      const data = await resp.json();
      explanationEl.textContent = data.explanation;
      provenanceEl.textContent = JSON.stringify(data.provenance, null, 2);
    };
    historyEl.appendChild(li);
  });
}

async function calculate(expression, previousId) {
  const payload = { expression };
  if (previousId) payload.previous_calculation_id = previousId;
  const resp = await fetch('/api/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await resp.json();
  if (!resp.ok) {
    explanationEl.textContent = data.error || 'Error';
    return null;
  }
  lastCalculationId = data.calculation_id;
  history.push(data);
  renderHistory();
  setDisplay(data.display_value, data.is_exact);
  explanationEl.textContent = data.explanation;
  provenanceEl.textContent = JSON.stringify(data.provenance, null, 2);
  // prepare detailed why panel data if available
  whyPanel.innerHTML = renderWhyPanel(data);
  whyPanel.style.display = 'none';
  return data;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"'`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
}

function renderWhyPanel(data) {
  const parts = [];
  parts.push(`<strong>Expression:</strong> ${escapeHtml(data.expression)}`);
  if (data.parsed_expression) parts.push(`<strong>Parsed expression:</strong> ${data.parsed_expression}`);
  if (data.math_representation) parts.push(`<strong>Mathematical representation:</strong> ${data.math_representation}`);
  parts.push(`<strong>Display:</strong> ${escapeHtml(data.display_value)}`);
  parts.push(`<strong>Precision:</strong> ${escapeHtml(data.precision || 'unknown')}`);
  parts.push(`<strong>Rounding occurred:</strong> ${data.provenance && data.provenance.roundedDigits ? 'Yes' : 'No'}`);
  parts.push(`<strong>Has provenance:</strong> ${data.provenance && data.provenance.source === 'calc' ? 'Yes' : 'No'}`);
  if (data.provenance && data.provenance.used_previous_calculation_id) {
    parts.push(`<strong>Previous calculation id:</strong> ${escapeHtml(data.provenance.used_previous_calculation_id)}`);
    parts.push(`<strong>Previous expression:</strong> ${escapeHtml(data.provenance.previous_expression)}`);
  }
  if (data.operation) parts.push(`<strong>Operation performed:</strong> ${data.operation}`);
  parts.push(`<strong>Final result:</strong> ${escapeHtml(data.display_value)} (exact: ${escapeHtml(data.exact_value)})`);
  if (data.explanation_steps && Array.isArray(data.explanation_steps)) {
    parts.push('<strong>Step-by-step explanation:</strong>');
    parts.push('<ol>' + data.explanation_steps.map(s => `<li>${escapeHtml(s)}</li>`).join('') + '</ol>');
  } else if (data.explanation) {
    parts.push(`<strong>Explanation:</strong> ${escapeHtml(data.explanation)}`);
  }
  parts.push('<p><em>Note:</em> If a value has provenance, the engine may use the underlying exact value rather than the rounded display when performing subsequent calculations.</p>');
  return parts.join('\n');
}

// wire buttons
document.querySelectorAll('button[data-val]').forEach((b) => {
  b.addEventListener('click', () => {
    input.value += b.dataset.val;
  });
});

calculateBtn.addEventListener('click', async () => {
  const expr = input.value.trim();
  if (!expr) return;
  await calculate(expr, null);
});

usePreviousBtn.addEventListener('click', async () => {
  const expr = input.value.trim();
  if (!lastCalculationId) { explanationEl.textContent = 'No previous calculation available to use.'; return; }
  // replace the word PREVIOUS if present, else construct a "previous * expr" or "expr * previous"
  if (expr.toLowerCase().includes('previous')) {
    await calculate(expr, lastCalculationId);
    return;
  }
  // by default assume user wants previous * <expr>
  // if expr is a number, use previous op expr
  if (/^[0-9.]+$/.test(expr)) {
    await calculate(`previous * ${expr}`, lastCalculationId);
    return;
  }
  explanationEl.textContent = 'To use previous, enter a number or include the word "previous" in the expression.';
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  setDisplay('0', true);
  explanationEl.textContent = 'Cleared.';
});

// initial
setDisplay('0', true);
explanationEl.textContent = 'Enter an expression like "10 / 3" or "3.33 * 3". Use "previous" to reference last result.';

whyBtn.addEventListener('click', () => {
  if (whyPanel.style.display === 'none') whyPanel.style.display = 'block';
  else whyPanel.style.display = 'none';
});
