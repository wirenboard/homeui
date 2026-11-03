// @vitest-environment happy-dom
import { callWithForceOnTemplateInUse, classifyTemplateError, formatTemplateOperationError } from './template-errors';

describe('classifyTemplateError', () => {
  it('classifies a plain Error without a data field as other', () => {
    expect(classifyTemplateError(new Error('network error'))).toEqual({ kind: 'other' });
  });

  it('classifies a non-string data field as other', () => {
    expect(classifyTemplateError({ data: { message: 'x' } })).toEqual({ kind: 'other' });
  });

  it('classifies error.data === "template-in-use" as template-in-use', () => {
    expect(classifyTemplateError({ data: 'template-in-use' })).toEqual({ kind: 'template-in-use' });
  });

  it('classifies an unrelated error.data string (e.g. config-busy) as other', () => {
    expect(classifyTemplateError({ data: 'config-busy' })).toEqual({ kind: 'other' });
  });

  it('parses error.data "apply-problems: <json>" into the problems payload', () => {
    const problems = {
      disabled_devices: [{ port: '/dev/ttyRS485-1', slave_id: '12' }],
      unread_devices: [],
      invalid_devices: [],
    };
    const result = classifyTemplateError({ data: `apply-problems: ${JSON.stringify(problems)}` });

    expect(result).toEqual({ kind: 'apply-problems', problems });
  });

  it('classifies malformed apply-problems JSON as other instead of throwing', () => {
    expect(() => classifyTemplateError({ data: 'apply-problems: {not json' })).not.toThrow();
    expect(classifyTemplateError({ data: 'apply-problems: {not json' })).toEqual({ kind: 'other' });
  });
});

describe('callWithForceOnTemplateInUse', () => {
  it('returns the result without asking to confirm when the call succeeds on the first try', async () => {
    const call = vi.fn().mockResolvedValue('ok');
    const confirmForce = vi.fn();

    const outcome = await callWithForceOnTemplateInUse(call, confirmForce);

    expect(outcome).toEqual({ forced: false, result: 'ok' });
    expect(confirmForce).not.toHaveBeenCalled();
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith();
  });

  it('retries with force when the user confirms a template-in-use error', async () => {
    const call = vi.fn()
      .mockRejectedValueOnce({ data: 'template-in-use' })
      .mockResolvedValueOnce('ok-forced');
    const confirmForce = vi.fn().mockResolvedValue(true);

    const outcome = await callWithForceOnTemplateInUse(call, confirmForce);

    expect(outcome).toEqual({ forced: true, result: 'ok-forced' });
    expect(confirmForce).toHaveBeenCalledWith({ kind: 'template-in-use' });
    expect(call).toHaveBeenNthCalledWith(2, true);
  });

  it('passes the parsed apply-problems payload to the confirmation callback', async () => {
    const problems = { disabled_devices: [], unread_devices: [], invalid_devices: [] };
    const call = vi.fn()
      .mockRejectedValueOnce({ data: `apply-problems: ${JSON.stringify(problems)}` })
      .mockResolvedValueOnce('ok-forced');
    const confirmForce = vi.fn().mockResolvedValue(true);

    await callWithForceOnTemplateInUse(call, confirmForce);

    expect(confirmForce).toHaveBeenCalledWith({ kind: 'apply-problems', problems });
  });

  it('returns undefined and does not retry when the user declines the confirmation', async () => {
    const call = vi.fn().mockRejectedValueOnce({ data: 'template-in-use' });
    const confirmForce = vi.fn().mockResolvedValue(false);

    const outcome = await callWithForceOnTemplateInUse(call, confirmForce);

    expect(outcome).toBeUndefined();
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('rethrows an error that is not template-in-use or apply-problems without asking to confirm', async () => {
    const err = { data: 'write-failed' };
    const call = vi.fn().mockRejectedValueOnce(err);
    const confirmForce = vi.fn();

    await expect(callWithForceOnTemplateInUse(call, confirmForce)).rejects.toBe(err);
    expect(confirmForce).not.toHaveBeenCalled();
  });
});

describe('formatTemplateOperationError', () => {
  it('prefixes the formatted error with the given action label', () => {
    expect(formatTemplateOperationError('Upload', new Error('boom'))).toBe('Upload: boom');
  });

  it('translates a known wb-mqtt-serial error code instead of showing it raw', () => {
    const err = { code: -32000, data: 'write-failed', message: 'Server error' };
    expect(formatTemplateOperationError('Upload', err)).toBe(
      'Upload: Error writing config. See the wb-mqtt-serial system log for details',
    );
  });
});
