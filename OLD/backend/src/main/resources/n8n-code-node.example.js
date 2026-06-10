// Code in JavaScript — place AFTER "AI Agent", BEFORE "Respond to Webhook"

const item = $input.first().json;

// AI Agent v3 may put text in different fields — try all common ones
let raw =
  item.output ??
  item.text ??
  item.response ??
  item.message?.content ??
  item.content;

if (raw == null) {
  throw new Error(
    'No AI Agent text found. Available keys: ' + Object.keys(item).join(', ')
  );
}

raw = String(raw)
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

const cleaned = JSON.parse(raw);

return [{ json: cleaned }];
