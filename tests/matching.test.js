import { describe, expect, it } from 'vitest';
import {
  matchProperties,
  propertyMatchesBudget,
  propertyMatchesCategory,
  propertyMatchesSize
} from '../src/pages/intelligence/filters.js';

const mockProperties = [
  {
    name: 'Baner High Street',
    tradeArea: 'pune-ban',
    tradeAreaName: 'Baner',
    city: 'Pune',
    suitableFor: ['fb', 'retail'],
    size: 1200,
    price: 700
  },
  {
    name: 'Kharadi Small Box',
    tradeArea: 'pune-kh',
    tradeAreaName: 'Kharadi',
    city: 'Pune',
    suitableFor: ['retail'],
    size: 420,
    price: 180
  },
  {
    name: 'Dubai Flagship',
    tradeArea: 'dubai-dt',
    tradeAreaName: 'Downtown Dubai',
    city: 'Dubai',
    suitableFor: ['lifestyle'],
    size: 6400,
    price: 1200
  }
];

describe('intelligence property matching', () => {
  it('filters by category, size, budget, and returns matching trade areas', () => {
    const result = matchProperties(
      {
        categories: ['F&B'],
        size: '500-2000',
        budget: '500-1000'
      },
      mockProperties
    );

    expect(result.properties).toHaveLength(1);
    expect(result.properties[0].name).toBe('Baner High Street');
    expect(result.tradeAreaIds).toEqual(['pune-ban']);
  });

  it('matches size and budget range boundaries inclusively', () => {
    expect(propertyMatchesSize({ size: 500 }, '500-2000')).toBe(true);
    expect(propertyMatchesSize({ size: 2000 }, '500-2000')).toBe(true);
    expect(propertyMatchesBudget({ price: 500 }, '500-1000')).toBe(true);
    expect(propertyMatchesBudget({ price: 1000 }, '500-1000')).toBe(true);
  });

  it('can match category from trade-area suitability when property categories are sparse', () => {
    expect(propertyMatchesCategory({ tradeArea: 'pune-ban', suitableFor: [] }, ['fb'])).toBe(true);
  });
});
