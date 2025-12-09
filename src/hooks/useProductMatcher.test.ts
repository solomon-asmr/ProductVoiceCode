import {findProduct} from './useProductMatcher';

// This mock tells Jest to use a fake version of the products.json file
// so our test doesn't depend on the real file.
jest.mock('../data/products.json', () => [
  {name: 'Classic Widget', id: 'W-001'},
  {name: 'Mega Gadget', id: 'G-1024'},
  {name: 'Super Spanner', id: 'S-SPAN-01'},
]);

describe('useProductMatcher', () => {
  it('should find a product with exact match', () => {
    const transcript = 'Mega Gadget';
    const product = findProduct(transcript);
    // UPDATE: Expect an array containing the object
    expect(product).toEqual([{name: 'Mega Gadget', id: 'G-1024'}]);
  });

  it('should find a product with case-insensitivity', () => {
    const transcript = 'classic widget';
    const product = findProduct(transcript);
    // UPDATE: Expect an array containing the object
    expect(product).toEqual([{name: 'Classic Widget', id: 'W-001'}]);
  });

  it('should find a product with extra whitespace', () => {
    const transcript = '  Super Spanner  ';
    const product = findProduct(transcript);
    // UPDATE: Expect an array containing the object
    expect(product).toEqual([{name: 'Super Spanner', id: 'S-SPAN-01'}]);
  });

  it('should return null for no match', () => {
    const transcript = 'Nonexistent Product';
    const product = findProduct(transcript);
    expect(product).toBeNull();
  });

  it('should return null for an empty string', () => {
    const transcript = '';
    const product = findProduct(transcript);
    expect(product).toBeNull();
  });
});
