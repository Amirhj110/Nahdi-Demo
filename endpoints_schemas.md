## DermIQ skin analysis

Source: [official DermIQ API documentation](https://www.dermiq.cloud/docs)

- Base URL: `https://dev.dermiq.cloud`
- Authentication: `Authorization: Bearer ${DERMIQ_API_KEY}`; keep the key server-side.
- `POST /v1/analyze`: `multipart/form-data` with a required `file` field (JPEG/PNG, max 10 MB). Returns `202` with `analysis_id` and `status`.
- `GET /v1/results/{analysis_id}`: poll the accepted analysis until `status` is `completed`; read `result_json`. Do not re-submit an accepted upload when polling.
- One analysis consumes one credit. The provider documents 10 free analyses and a 30-request/minute free-plan limit.
- Higher metric scores are healthier. The app maps these to visible-signal estimates and keeps the overall provider score separate.
- The documented result includes acne, pores, redness, oiliness, and texture, but not a pigmentation/dark-spots score; the app marks that observation unavailable rather than substituting dark circles or another metric.

### V3 Google Gemini Vision fallback

The V3 server uses DermIQ first and falls back to Google Gemini Vision if DermIQ is unavailable, rate-limited, out of quota, times out, or returns an unusable provider response. Invalid user images are rejected without sending them to either provider. Configure `GEMINI_VISION_API_KEY` server-side; never expose it with a `VITE_` prefix.

The local `/api/assistant/skin-analysis` endpoint accepts the existing image payload plus optional `provider: "auto" | "dermiq" | "google"` (`auto` is the user-facing default). Its success response includes `provider: "dermiq"` or `"google"` so the UI can identify the source. Explicit provider modes support verification without spending a DermIQ credit when testing Google.

Gemini uses `gemini-3.1-flash-lite` with the image sent as inline data. A successful response contains only `concerns`, a list of supported IDs (`dryness`, `oiliness`, `blackheads`, `acne`, `redness`, `dark_spots`, `texture`, `pores`) and medium/high confidence. Low-confidence signals are omitted. The prompt requires visible flaking for dryness, visible shine rather than an oil-production claim for oiliness, and acne-like wording rather than a diagnosis. DermIQ maps its supported acne, oiliness, redness, texture, and pore signals to the same concern list; it does not invent dryness, blackheads, or dark spots. The UI displays only this concern list, matches only catalogued concerns to products, and preserves scan concerns and attached product names in subsequent chat context. Explicit scan-product requests return the attached catalogue cards directly, avoiding model substitutions; routine requests continue through the existing routine action flow.

Speech
POST
/v1/tts
Text → Speech
Synthesize speech from text using a platform-managed voice.

Try it
Schema
cURL
JavaScript
Response
Required scopes:
tts
Request body
· Send as application/json
Name	Type	Required	Description
text	string	required	Text to synthesize. Up to ~5,000 characters per call.
voice_id	string	optional	Optional. Catalog id (`khaleeji:female_01`, `sa_najdi:female_01`) or legacy `silma_default_en` / `silma_default_ar`. Omit with dialect omitted to keep the default language path.
sa_najdi:female_01
sa_najdi:male_01
sa_hijazi:female_01
sa_hijazi:male_01
khaleeji:female_01
khaleeji:male_01
sa_khaleeji:female_01
sa_khaleeji:male_01
silma_default_en
silma_default_ar
dialect	string	optional	Optional dialect code (e.g. `khaleeji`, `sa_najdi`). Use with a short `voice_id` like `female_01`, or omit when `voice_id` already includes dialect. `sa_khaleeji` is accepted as an alias of `khaleeji`.
sa_najdi
sa_hijazi
khaleeji
sa_khaleeji
language	string	optional	Used when no dialect voice is selected. Inferred from legacy silma voice ids when those are used.· default en
en
ar
Response (200)
Name	Type	Required	Description
audio_base64	string	optional	Base64-encoded audio bytes. Only returned when JSON is explicitly requested via `?format=json`, `response_format: "json"` in the body, or an `Accept` header that is exactly `application/json`. Default response is a raw binary audio file (Content-Type: audio/mpeg, Content-Disposition: attachment).
content_type	string	optional	MIME type of the encoded audio.
characters	number	optional	Characters billed for this request.
Example payload
{
  "text": "مرحباً من إدراك",
  "voice_id": "sa_najdi:female_01"
}

Errors
Status	Code	Description
401	missing_api_key	No Authorization header was provided.
401	invalid_api_key	The provided API key is invalid, revoked, or expired.
403	scope_denied	The API key does not have the required scope for this endpoint.
429	rate_limited	Per-minute request quota exceeded for this key.
402	quota_exceeded	Tenant monthly cost cap reached and hard-stop is enabled.
GET
/v1/tts/voices
List TTS voices
Returns dialect catalog voices available for POST /v1/tts, plus legacy silma defaults. voice_id and dialect remain optional on synthesize.

Try it
Schema
cURL
JavaScript
Response
GET
https://idrak.bilyticaglobal.com/api/v1/tts/voices
Send
POST
/v1/stt
Speech → Text
Transcribe audio to text with language detection.

Try it
Schema
cURL
JavaScript
Response
Required scopes:
stt
Form fields
· Send as multipart/form-data
Name	Type	Required	Description
file	file	required	Audio file (mp3, wav, m4a, webm, ogg, flac). Max ~25 MB.
language	string	optional	ISO-639-1 code, or 'auto' to detect.· default auto
diarize	boolean	optional	Return per-speaker segments when true.· default false
timestamps	string	optional	Granularity of timing info to include.· default none
none
word
segment
Response (200)
Name	Type	Required	Description
text	string	optional	Full transcript.
language	string	optional	Detected or echoed language code.
duration	number	optional	Audio duration in seconds.
segments	object[]	optional	Optional per-segment objects with start, end, speaker, text.
Example payload
{
  "file": "@audio.mp3",
  "language": "en"
}

Errors
Status	Code	Description
401	missing_api_key	No Authorization header was provided.
401	invalid_api_key	The provided API key is invalid, revoked, or expired.
403	scope_denied	The API key does not have the required scope for this endpoint.
429	rate_limited	Per-minute request quota exceeded for this key.
402	quota_exceeded	Tenant monthly cost cap reached and hard-stop is enabled.
POST
/v1/voice-changer
Voice → Voice
Transform audio to a different voice profile.

Try it
Schema
cURL
JavaScript
Required scopes:
voice_changer
Form fields
· Send as multipart/form-data
Name	Type	Required	Description
audio	file	required	Source audio (mp3/wav/m4a, max ~25 MB).
voice_id	string	required	Target ElevenLabs voice id.
model_id	string	optional	Speech-to-speech model.· default eleven_multilingual_sts_v2
Response (200)
Name	Type	Required	Description
(binary)	audio/mpeg	optional	MP3 stream of the converted audio. Inspect `X-Request-Id` for tracing.
Example payload
{
  "audio": "@input.mp3",
  "voice_id": "21m00Tcm4TlvDq8ikWAM"
}

Errors
Status	Code	Description
401	missing_api_key	No Authorization header was provided.
401	invalid_api_key	The provided API key is invalid, revoked, or expired.
403	scope_denied	The API key does not have the required scope for this endpoint.
429	rate_limited	Per-minute request quota exceeded for this key.
402	quota_exceeded	Tenant monthly cost cap reached and hard-stop is enabled.
POST
/v1/speech-to-speech
Speech → Reply (STT + LLM + TTS)
Full voice pipeline: transcribe, generate a reply, and synthesize speech.

Try it
Schema
cURL
JavaScript
Required scopes:
stt
Form fields
· Send as multipart/form-data
Name	Type	Required	Description
file	file	required	User audio (webm/ogg/mp4/wav/mp3/m4a, ≤25 MB).
session_id	string	optional	Conversation id (≤128 chars). Auto-generated if omitted; reuse to continue the same conversation.
model	string	optional	Public LLM model id. Use `idraqv1` (default).· default idraqv1
idraqv1
voice_id	string	optional	Silma voice for the spoken reply.· default silma_default_en
silma_default_en
silma_default_ar
language	string	optional	Language hint forwarded to STT and LLM.· default auto
en
ar
auto
system_prompt	string	optional	Prepended to a same-language rule before the LLM call.
Response (200)
Name	Type	Required	Description
(binary)	audio/mpeg	optional	Raw spoken reply. Inspect headers `X-User-Transcript`, `X-Assistant-Text`, `X-Stt-Latency-Ms`, `X-Llm-Latency-Ms`, `X-Tts-Latency-Ms`, `X-Total-Latency-Ms`, `X-Session-Id`, `X-Request-Id`.
Example payload
{
  "file": "@question.webm",
  "voice_id": "silma_default_en",
  "language": "auto",
  "session_id": "sess-demo-001"
}

Errors
Status	Code	Description
401	missing_api_key	No Authorization header was provided.
401	invalid_api_key	The provided API key is invalid, revoked, or expired.
403	scope_denied	The API key does not have the required scope for this endpoint.
429	rate_limited	Per-minute request quota exceeded for this key.
402	quota_exceeded	Tenant monthly cost cap reached and hard-stop is enabled.
413	validation_error	Uploaded audio exceeds 25 MB.
422	stage_failed	A pipeline stage failed; body is `{ stage, detail }` where stage ∈ stt|llm|tts.
503	provider_unavailable	STT/LLM/TTS provider not connected.
Text & Vision
POST
/v1/text-to-text
Generate text
Chat completion with session memory and tool use.

Try it
Schema
cURL
JavaScript
Response
Required scopes:
chat
Request body
· Send as application/json
Name	Type	Required	Description
model	string	optional	Public model id. Use `idraqv1` (default).· default idraqv1
idraqv1
message	string	required	User message sent to the model.
system_prompt	string	required	System instructions for the model. Pass an empty string if none.
session_id	string	required	Conversation session id. Forwarded verbatim to the upstream gateway (max 128 chars).
Response (200)
Name	Type	Required	Description
response	string	optional	Generated text reply from the model.
model	string	optional	Public model id (`idraqv1`).
done	boolean	optional	Always `true` for non-streamed responses.
session_id	string	optional	Session id used for this call. Pass it back on the next request to keep the same conversation.
Example payload
{
  "model": "idraqv1",
  "message": "Hello, tell me about Idrak",
  "system_prompt": "you are a 2 years old boy",
  "session_id": "sess-demo-001"
}

Errors
Status	Code	Description
401	missing_api_key	No Authorization header was provided.
401	invalid_api_key	The provided API key is invalid, revoked, or expired.
403	scope_denied	The API key does not have the required scope for this endpoint.
429	rate_limited	Per-minute request quota exceeded for this key.
402	quota_exceeded	Tenant monthly cost cap reached and hard-stop is enabled.
POST
/v1/images/generations
Generate images
Create images from a text prompt.

Try it
Schema
cURL
JavaScript
Response
POST
https://idrak.bilyticaglobal.com/api/v1/images/generations
Send
Request body (JSON)
{
  "prompt": "A neon-lit cyberpunk skyline at dusk",
  "size": "1024x1024"
}
POST
/v1/vision
Image understanding
Analyze images with a vision-capable model.

Try it
Schema
cURL
JavaScript
Response
curl -X POST "https://idrak.bilyticaglobal.com/api/v1/vision" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{"image_url":"https://example.com/receipt.png","prompt":"Extract the total amount and merchant name."}'

Media
