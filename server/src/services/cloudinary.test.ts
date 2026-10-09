import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { signUpload } from './cloudinary.js';

describe('signUpload', () => {
  it('assina os parâmetros em ordem alfabética + segredo (SHA-1)', () => {
    const sig = signUpload({ cloudName: 'demo', apiKey: 'k', apiSecret: 's3cr3t' }, 'chatfire/users/u1', 'avatar');
    const expected = createHash('sha1')
      .update(
        `allowed_formats=jpg,jpeg,png,webp,heic&folder=chatfire/users/u1&invalidate=true&overwrite=true&public_id=avatar&timestamp=${sig.params.timestamp}s3cr3t`,
      )
      .digest('hex');
    assert.equal(sig.signature, expected);
    assert.equal(sig.uploadUrl, 'https://api.cloudinary.com/v1_1/demo/image/upload');
    assert.equal('apiSecret' in sig, false);
  });
});
