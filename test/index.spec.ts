import { TrueSolarTimeCalculator } from '../src';
import { describe, it, expect } from '@jest/globals';

describe('TrueSolarTimeCalculator', () => {
  describe('基本功能', () => {
    it('应该正确初始化计算器', () => {
      const date = new Date('2024-03-20T12:00:00Z');
      const longitude = 120;
      const latitude = 30;

      const calculator = new TrueSolarTimeCalculator(date, longitude, latitude);

      expect(calculator.longitude).toBe(longitude);
      expect(calculator.latitude).toBe(latitude);
      expect(calculator.utcDate.getTime()).toBe(date.getTime());
    });

    it('应该验证经度范围', () => {
      const date = new Date();
      expect(() => {
        new TrueSolarTimeCalculator(date, -181, 0);
      }).toThrow('Longitude must be between -180 and 180 degrees.');

      expect(() => {
        new TrueSolarTimeCalculator(date, 181, 0);
      }).toThrow('Longitude must be between -180 and 180 degrees.');
    });

    it('应该验证纬度范围', () => {
      const date = new Date();
      expect(() => {
        new TrueSolarTimeCalculator(date, 0, -91);
      }).toThrow('Latitude must be between -90 and 90 degrees.');

      expect(() => {
        new TrueSolarTimeCalculator(date, 0, 91);
      }).toThrow('Latitude must be between -90 and 90 degrees.');
    });
  });

  describe('时间计算', () => {
    it('应该计算儒略日', () => {
      const date = new Date('2024-03-20T12:00:00Z');
      const calculator = new TrueSolarTimeCalculator(date, 120, 30);

      // 2024-03-20 12:00:00 UTC 对应的儒略日约为 2460390
      expect(Math.floor(calculator.julianDay)).toBe(2460390);
    });

    it('应该计算真太阳时', () => {
      const date = new Date('2024-03-20T12:00:00Z');
      const calculator = new TrueSolarTimeCalculator(date, 120, 30);

      const result = calculator.calculateTrueSolarTime().getDate();
      expect(result).toBeInstanceOf(Date);
    });

    it('应该正确计算2025年5月3日的真太阳时', () => {
      const date = new Date('2025-05-03 16:39:53');
      const calculator = new TrueSolarTimeCalculator(date, 120, 30);

      const result = calculator.calculateTrueSolarTime().getDate();

      // 验证结果是Date对象
      expect(result).toBeInstanceOf(Date);

      // 验证年月日保持不变
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(4); // 5月对应的是4（0-based）
      expect(result.getUTCDate()).toBe(3);

      // 验证具体时分
      expect(result.getUTCHours()).toBe(16);
      expect(result.getUTCMinutes()).toBe(43);

      // 验证秒数在合理范围内
      expect(result.getUTCSeconds()).toBeGreaterThanOrEqual(0);
      expect(result.getUTCSeconds()).toBeLessThan(60);
    });

    it('应该格式化输出真太阳时', () => {
      const date = new Date('2024-03-20T12:00:00Z');
      const calculator = new TrueSolarTimeCalculator(date, 120, 30);

      const formatted = calculator.format('YYYY-MM-DD HH:mm:ss');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('应该提供人类可读的时差信息', () => {
      const date = new Date('2024-03-20T12:00:00Z');
      const calculator = new TrueSolarTimeCalculator(date, 120, 30);

      const eotString = calculator.getHumanReadableEOT();
      expect(typeof eotString).toBe('string');
      expect(eotString).toMatch(/^(\d+分)?(\d+秒)?$/);
    });
  });
});
