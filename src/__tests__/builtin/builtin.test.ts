import { expect } from 'chai';
import date from '../../CADL/services/date';

describe('获取指定日期明天的日期', () => {
  it('获取2024.3.14明天的日期', () => {
    expect(date.getTomorrowDate({
      date: "03/14/2024"
    })).to.equal("03/15/2024");
  })
});

