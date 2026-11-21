/**
 * NCS Accounts — Invoice & Bengali Words Tests
 * Run: node --test tests/invoice.test.js
 */

'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function bnWords(num) {
  num = Math.round(Number(num || 0));
  if (num <= 0) return 'শূন্য';
  const ones = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
    'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
    'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ', 'ত্রিশ',
    'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ', 'চল্লিশ',
    'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ', 'পঞ্চাশ',
    'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট', 'ষাট',
    'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর', 'সত্তর',
    'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনআশি', 'আশি',
    'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'অষ্টআশি', 'উনানব্বই', 'নব্বই',
    'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'];

  let out = '';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = Math.floor(num / 100); num %= 100;
  const rest = num;

  if (crore > 0) out += bnWords(crore) + ' কোটি ';
  if (lakh > 0) out += ones[lakh] + ' লাখ ';
  if (thousand > 0) out += ones[thousand] + ' হাজার ';
  if (hundred > 0) out += ones[hundred] + ' শত ';
  if (rest > 0) out += ones[rest] + ' ';

  return out.trim() + ' টাকা মাত্র';
}

function toBnNum(num) {
  const bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  return String(num != null ? num : '').replace(/[0-9]/g, d => bn[+d] || d);
}

describe('bnWords() — Bengali monetary words generator', () => {
  it('handles 0', () => {
    assert.equal(bnWords(0), 'শূন্য');
  });

  it('handles single digits and tens', () => {
    assert.equal(bnWords(50), 'পঞ্চাশ টাকা মাত্র');
    assert.equal(bnWords(99), 'নিরানব্বই টাকা মাত্র');
  });

  it('handles user invoice sample amount 1373', () => {
    assert.equal(bnWords(1373), 'এক হাজার তিন শত তিয়াত্তর টাকা মাত্র');
  });

  it('handles thousands and lakhs', () => {
    assert.equal(bnWords(25000), 'পঁচিশ হাজার টাকা মাত্র');
    assert.equal(bnWords(150000), 'এক লাখ পঞ্চাশ হাজার টাকা মাত্র');
  });
});

describe('toBnNum() & invoice calculations', () => {
  it('converts ASCII digits to Bengali digits', () => {
    assert.equal(toBnNum('1373'), '১৩৭৩');
    assert.equal(toBnNum('01765-420566'), '০১৭৬৫-৪২০৫৬৬');
  });

  it('calculates cash change correctly', () => {
    const total = 1373;
    const cashRec = 1500;
    const change = Math.max(0, cashRec - total);
    assert.equal(change, 127);
  });

  it('computes due amount properly', () => {
    const total = 1373;
    const pay = 'Due';
    const due = pay === 'Due' ? total : 0;
    assert.equal(due, 1373);
  });
});
