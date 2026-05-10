import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebhookService } from '../webhook-service';
import type { WebhookConfig, WebhookEvent } from '../webhook-types';

// Mock the signature module
vi.mock('../webhook-signature', () => ({
  signPayload: vi.fn().mockResolvedValue('mock-signature-hex'),
  generateTimestamp: vi.fn().mockReturnValue('2024-06-15T10:00:00.000Z'),
  buildSignatureHeader: vi.fn().mockReturnValue('t=2024-06-15T10:00:00.000Z,v1=mock-signature-hex'),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(body: unknown, ok = true, status = 200, statusText = 'OK') {
  return Promise.resolve({
    ok,
    status,
    statusText,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response);
}

function makeWebhookConfig(overrides?: Partial<WebhookConfig>): WebhookConfig {
  return {
    id: 'wh_test_1',
    url: 'https://example.com/webhook',
    events: ['doctor.created', 'visit.completed'] as WebhookEvent[],
    secret: 'whsec_testsecret123456789012345',
    isActive: true,
    description: 'Test webhook',
    retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebhookService', () => {
  let service: WebhookService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset the singleton so each test gets a clean instance
    (WebhookService as any).instance = null;
    service = WebhookService.getInstance();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockReset();
  });

  afterEach(() => {
    (WebhookService as any).instance = null;
  });

  // ── Singleton ──────────────────────────────────────────────────────────

  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = WebhookService.getInstance();
      const b = WebhookService.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── register ───────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a webhook with generated id and timestamps', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({}));

      const result = await service.register({
        url: 'https://example.com/hook',
        events: ['doctor.created'],
        secret: 'secret',
        isActive: true,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      });

      expect(result.id).toMatch(/^wh_/);
      expect(result.url).toBe('https://example.com/hook');
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
      // Should POST to persist
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/webhooks',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  // ── unregister ─────────────────────────────────────────────────────────

  describe('unregister', () => {
    it('deletes webhook and returns true on success', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({}, true));

      const result = await service.unregister('wh_test_1');
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/webhooks/wh_test_1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('returns false on failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const result = await service.unregister('wh_test_1');
      expect(result).toBe(false);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates webhook config', async () => {
      const existing = makeWebhookConfig();
      fetchSpy
        .mockImplementationOnce(() => mockFetchResponse({ data: [existing] })) // loadWebhooks
        .mockImplementationOnce(() => mockFetchResponse({})); // persistWebhookUpdate

      const result = await service.update('wh_test_1', { description: 'Updated' });

      expect(result).not.toBeNull();
      expect(result!.description).toBe('Updated');
      expect(result!.updatedAt).toBeTruthy();
    });

    it('returns null when webhook not found', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [] }));

      const result = await service.update('nonexistent', { description: 'fail' });
      expect(result).toBeNull();
    });
  });

  // ── getAll / getById ───────────────────────────────────────────────────

  describe('getAll', () => {
    it('loads and returns all webhooks', async () => {
      const webhooks = [makeWebhookConfig()];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: webhooks }));

      const result = await service.getAll();
      expect(result).toEqual(webhooks);
    });

    it('returns empty array on fetch failure', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse(null, false));

      const result = await service.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('finds webhook by id', async () => {
      const webhooks = [makeWebhookConfig()];
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: webhooks }));

      const result = await service.getById('wh_test_1');
      expect(result).toEqual(webhooks[0]);
    });

    it('returns null when not found', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [] }));

      const result = await service.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── dispatch ───────────────────────────────────────────────────────────

  describe('dispatch', () => {
    it('delivers to matching active webhooks', async () => {
      const webhook = makeWebhookConfig();
      // 1st call: loadWebhooks, 2nd call: deliver, 3rd call: persistDelivery
      fetchSpy
        .mockImplementationOnce(() => mockFetchResponse({ data: [webhook] }))
        .mockImplementationOnce(() => mockFetchResponse('ok', true, 200))
        .mockImplementationOnce(() => mockFetchResponse({}));

      const deliveries = await service.dispatch('doctor.created', { id: 'doc-1' });

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].event).toBe('doctor.created');
      expect(deliveries[0].statusCode).toBe(200);
      expect(deliveries[0].deliveredAt).toBeTruthy();
      expect(deliveries[0].error).toBeUndefined();
    });

    it('skips inactive webhooks', async () => {
      const webhook = makeWebhookConfig({ isActive: false });
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [webhook] }));

      const deliveries = await service.dispatch('doctor.created', {});
      expect(deliveries).toHaveLength(0);
    });

    it('skips webhooks not subscribed to the event', async () => {
      const webhook = makeWebhookConfig({ events: ['visit.completed'] });
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [webhook] }));

      const deliveries = await service.dispatch('doctor.created', {});
      expect(deliveries).toHaveLength(0);
    });

    it('records error and nextRetryAt on delivery failure', async () => {
      const webhook = makeWebhookConfig();
      fetchSpy
        .mockImplementationOnce(() => mockFetchResponse({ data: [webhook] }))
        .mockImplementationOnce(() => mockFetchResponse('error', false, 500, 'Internal Server Error'))
        .mockImplementationOnce(() => mockFetchResponse({}));

      const deliveries = await service.dispatch('doctor.created', {});

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].error).toContain('HTTP 500');
      expect(deliveries[0].nextRetryAt).toBeTruthy();
      expect(deliveries[0].deliveredAt).toBeUndefined();
    });

    it('handles timeout/network errors', async () => {
      const webhook = makeWebhookConfig();
      fetchSpy
        .mockImplementationOnce(() => mockFetchResponse({ data: [webhook] }))
        .mockImplementationOnce(() => Promise.reject(new Error('Connection refused')))
        .mockImplementationOnce(() => mockFetchResponse({}));

      const deliveries = await service.dispatch('doctor.created', {});

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].error).toBe('Connection refused');
      expect(deliveries[0].statusCode).toBe(0);
    });

    it('includes signature header in delivery', async () => {
      const webhook = makeWebhookConfig();
      fetchSpy
        .mockImplementationOnce(() => mockFetchResponse({ data: [webhook] }))
        .mockImplementationOnce(() => mockFetchResponse('ok', true))
        .mockImplementationOnce(() => mockFetchResponse({}));

      await service.dispatch('doctor.created', {});

      // The second fetch call is the delivery
      const deliveryCall = fetchSpy.mock.calls[1];
      const headers = (deliveryCall[1] as RequestInit).headers as Record<string, string>;
      expect(headers['X-Webhook-Signature']).toContain('v1=');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('ERP-Webhook/1.0');
    });
  });

  // ── retry ──────────────────────────────────────────────────────────────

  describe('retry', () => {
    it('retries a failed delivery', async () => {
      const webhook = makeWebhookConfig();
      const delivery = {
        id: 'del_1',
        webhookId: 'wh_test_1',
        event: 'doctor.created' as WebhookEvent,
        payload: { event: 'doctor.created', timestamp: '2024-01-01', data: {} },
        statusCode: 500,
        error: 'HTTP 500',
        attempts: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      fetchSpy
        // getDeliveries
        .mockImplementationOnce(() => mockFetchResponse({ data: [delivery] }))
        // loadWebhooks for getById
        .mockImplementationOnce(() => mockFetchResponse({ data: [webhook] }))
        // deliverToEndpoint
        .mockImplementationOnce(() => mockFetchResponse('ok', true, 200))
        // persistDelivery
        .mockImplementationOnce(() => mockFetchResponse({}));

      const result = await service.retry('del_1');

      expect(result).not.toBeNull();
      expect(result!.attempts).toBe(2);
      expect(result!.deliveredAt).toBeTruthy();
      expect(result!.error).toBeUndefined();
    });

    it('returns null when delivery not found', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [] }));

      const result = await service.retry('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── testWebhook ────────────────────────────────────────────────────────

  describe('testWebhook', () => {
    it('sends a test delivery', async () => {
      const webhook = makeWebhookConfig();
      fetchSpy
        .mockImplementationOnce(() => mockFetchResponse({ data: [webhook] }))
        .mockImplementationOnce(() => mockFetchResponse('ok', true, 200))
        .mockImplementationOnce(() => mockFetchResponse({}));

      const result = await service.testWebhook('wh_test_1');

      expect(result).not.toBeNull();
      expect(result!.event).toBe('test');
    });

    it('returns null when webhook not found', async () => {
      fetchSpy.mockImplementation(() => mockFetchResponse({ data: [] }));

      const result = await service.testWebhook('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── generateSecret ────────────────────────────────────────────────────

  describe('generateSecret', () => {
    it('generates a secret with whsec_ prefix', () => {
      const secret = service.generateSecret();
      expect(secret).toMatch(/^whsec_/);
      expect(secret.length).toBeGreaterThan(10);
    });
  });

  // ── getDeliveryStatus ──────────────────────────────────────────────────

  describe('getDeliveryStatus', () => {
    it('returns "delivered" when deliveredAt is set', () => {
      const delivery: any = { deliveredAt: '2024-01-01', error: undefined };
      expect(service.getDeliveryStatus(delivery)).toBe('delivered');
    });

    it('returns "failed" when error is set', () => {
      const delivery: any = { deliveredAt: undefined, error: 'HTTP 500' };
      expect(service.getDeliveryStatus(delivery)).toBe('failed');
    });

    it('returns "pending" when no deliveredAt and no error', () => {
      const delivery: any = { deliveredAt: undefined, error: undefined };
      expect(service.getDeliveryStatus(delivery)).toBe('pending');
    });
  });
});
