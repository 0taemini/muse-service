const { GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3 = new S3Client({});

const VARIANT_POLICIES = {
  poster: [
    { variantType: 'THUMB_480', width: 480, suffix: '480' },
    { variantType: 'POSTER_1600', width: 1600, suffix: '1600' },
  ],
  memory: [
    { variantType: 'THUMB_320', width: 320, suffix: '320' },
    { variantType: 'THUMB_480', width: 480, suffix: '480' },
    { variantType: 'DETAIL_1200', width: 1200, suffix: '1200' },
  ],
  album: [
    { variantType: 'THUMB_320', width: 320, suffix: '320' },
    { variantType: 'THUMB_480', width: 480, suffix: '480' },
    { variantType: 'DETAIL_1200', width: 1200, suffix: '1200' },
  ],
};

exports.handler = async (event) => {
  console.log('S3 event received:', JSON.stringify(event));

  const records = event.Records ?? [];
  const results = [];

  for (const record of records) {
    const bucket = record.s3?.bucket?.name;
    const key = decodeURIComponent((record.s3?.object?.key ?? '').replace(/\+/g, ' '));

    if (!bucket || !key) {
      console.warn('Skipped record without bucket/key:', JSON.stringify(record));
      continue;
    }

    results.push(await processObject(bucket, key));
  }

  return { processed: results.length, results };
};

async function processObject(bucket, key) {
  const parsed = parseOriginalKey(key);
  if (!parsed) {
    console.log(`Skipped unsupported key: ${key}`);
    return { key, skipped: true };
  }

  const outputBucket = process.env.OUTPUT_BUCKET || bucket;

  try {
    const original = await getObjectBuffer(bucket, key);
    const variants = VARIANT_POLICIES[parsed.type];

    for (const variant of variants) {
      const resized = await resizeToWebp(original, variant.width);
      const resizedKey = resizedKeyFor(parsed, variant.suffix);

      await s3.send(new PutObjectCommand({
        Bucket: outputBucket,
        Key: resizedKey,
        Body: resized.buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      await callbackVariant(parsed.imageId, {
        variantType: variant.variantType,
        s3Key: resizedKey,
        width: resized.width,
        height: resized.height,
        contentType: 'image/webp',
      });
    }

    return { key, imageId: parsed.imageId, type: parsed.type, status: 'READY' };
  } catch (error) {
    console.error(`Failed to process image: key=${key}`, error);
    await callbackFailed(parsed.imageId);
    throw error;
  }
}

function parseOriginalKey(key) {
  const match = key.match(/^original\/(poster|memory|album)\/(\d+)\/([^/]+)\.[^.]+$/i);
  if (!match) {
    return null;
  }

  return {
    type: match[1].toLowerCase(),
    imageId: Number(match[2]),
    baseName: match[3],
  };
}

function resizedKeyFor(parsed, suffix) {
  return `resized/${parsed.type}/${parsed.imageId}/${parsed.baseName}_${suffix}.webp`;
}

async function getObjectBuffer(bucket, key) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return streamToBuffer(response.Body);
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function resizeToWebp(input, width) {
  const pipeline = sharp(input)
    .rotate()
    .resize({
      width,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({ quality: 82 });

  const buffer = await pipeline.toBuffer();
  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    width: metadata.width ?? width,
    height: metadata.height ?? null,
  };
}

async function callbackVariant(imageId, payload) {
  const url = backendUrl(`/api/v1/images/${imageId}/variants`);
  const response = await fetch(url, {
    method: 'POST',
    headers: callbackHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Variant callback failed: status=${response.status}, body=${await response.text()}`);
  }
}

async function callbackFailed(imageId) {
  const url = backendUrl(`/api/v1/images/${imageId}/failed`);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: callbackHeaders(),
  });

  if (!response.ok) {
    console.error(`Failed callback failed: status=${response.status}, body=${await response.text()}`);
  }
}

function backendUrl(path) {
  const baseUrl = process.env.BACKEND_BASE_URL;
  if (!baseUrl) {
    throw new Error('BACKEND_BASE_URL is required.');
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function callbackHeaders() {
  const token = process.env.BACKEND_CALLBACK_TOKEN;
  if (!token) {
    throw new Error('BACKEND_CALLBACK_TOKEN is required.');
  }

  return {
    'Content-Type': 'application/json',
    'X-Muse-Image-Callback-Token': token,
  };
}
