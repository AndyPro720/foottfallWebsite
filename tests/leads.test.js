import { describe, expect, it, vi } from 'vitest';
import { getLeadContext, submitLeadData, validateLeadFields } from '../src/pages/intelligence/ui.js';

describe('intelligence lead handling', () => {
  it('requires complete warm lead contact fields and a valid email', () => {
    expect(validateLeadFields({
      name: 'Rahul',
      brand: 'Foottfall Cafe',
      phone: '9999999999',
      email: 'rahul@example.com'
    }).valid).toBe(true);

    const missing = validateLeadFields({
      name: 'Rahul',
      brand: '',
      phone: '',
      email: 'not-an-email'
    });

    expect(missing.valid).toBe(false);
    expect(missing.missing).toEqual(['brand', 'phone']);
    expect(missing.emailValid).toBe(false);
  });

  it('posts lead FormData to the configured advisory API', async () => {
    const formData = new FormData();
    formData.set('name', 'Rahul');
    formData.set('brand', 'Foottfall Cafe');
    formData.set('phone', '9999999999');
    formData.set('email', 'rahul@example.com');

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true })
    }));

    const result = await submitLeadData({
      action: 'https://api.web3forms.com/submit',
      fields: {
        name: 'Rahul',
        brand: 'Foottfall Cafe',
        phone: '9999999999',
        email: 'rahul@example.com'
      },
      formData
    }, fetchImpl);

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.web3forms.com/submit', expect.objectContaining({
      method: 'POST',
      body: formData
    }));
  });

  it('serializes match context into the lead payload metadata', () => {
    const context = getLeadContext({
      query: { categories: ['fb'], size: '500-2000', budget: '500-1000' },
      properties: [{ name: 'Baner High Street' }],
      tradeAreaIds: ['pune-ban']
    });

    expect(JSON.parse(context)).toEqual({
      query: { categories: ['fb'], size: '500-2000', budget: '500-1000' },
      propertyCount: 1,
      tradeAreaIds: ['pune-ban']
    });
  });
});
