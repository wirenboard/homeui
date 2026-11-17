import { RegSpace } from './reg-space';
import type { Register } from './types';

function makeReg(overrides: Partial<Register> = {}): Register {
  return {
    topic: '/devices/wb-adc/controls/Vin',
    address: 100,
    enabled: true,
    unitId: 3,
    ...overrides,
  };
}

const RESERVED_UNIT_IDS = [0, 1, 2, 247, 248, 249, 250, 251, 252, 253, 254, 255];

describe('RegSpace', () => {
  test('starts with empty address set', () => {
    expect(new RegSpace().addrs.size).toBe(0);
  });

  test('append with assign=false records address', () => {
    const rs = new RegSpace();
    rs.append(makeReg({ address: 10, unitId: 3 }), false);
    expect(rs.addrs.has(10 | (3 << 16))).toBe(true);
  });

  test('append with assign=false records multi-word register', () => {
    const rs = new RegSpace();
    rs.append(makeReg({ address: 10, unitId: 3, format: 'signed', size: 4 }), false);
    expect(rs.addrs.has(10 | (3 << 16))).toBe(true);
    expect(rs.addrs.has(11 | (3 << 16))).toBe(true);
    expect(rs.addrs.size).toBe(2);
  });

  test('append with assign=true sets address and unitId', () => {
    const rs = new RegSpace();
    const reg = makeReg({ topic: 'test-topic' });
    rs.append(reg, true);
    expect(reg.address).toBeGreaterThanOrEqual(0);
    expect(RESERVED_UNIT_IDS).not.toContain(reg.unitId);
  });

  test('append with assign=true avoids existing addresses', () => {
    const rs = new RegSpace();
    const reg1 = makeReg({ topic: 'topic-a' });
    const reg2 = makeReg({ topic: 'topic-b' });
    rs.append(reg1, true);
    rs.append(reg2, true);
    const addr1 = reg1.address | (reg1.unitId << 16);
    const addr2 = reg2.address | (reg2.unitId << 16);
    expect(addr1).not.toBe(addr2);
  });

  test('append with assign=true avoids reserved unitIds', () => {
    const rs = new RegSpace();
    for (let i = 0; i < 50; i++) {
      const reg = makeReg({ topic: `topic-${i}` });
      rs.append(reg, true);
      expect(RESERVED_UNIT_IDS).not.toContain(reg.unitId);
    }
  });

  test('single-word register occupies one address', () => {
    const rs = new RegSpace();
    const reg = makeReg({ topic: 'test' });
    rs.append(reg, true);
    const addr = reg.address | (reg.unitId << 16);
    expect(rs.addrs.has(addr)).toBe(true);
    expect(rs.addrs.has(addr + 1)).toBe(false);
  });

  test('varchar format uses size as word count', () => {
    const rs = new RegSpace();
    const reg = makeReg({ topic: 'test', format: 'varchar', size: 3 });
    rs.append(reg, true);
    const addr = reg.address | (reg.unitId << 16);
    expect(rs.addrs.has(addr)).toBe(true);
    expect(rs.addrs.has(addr + 1)).toBe(true);
    expect(rs.addrs.has(addr + 2)).toBe(true);
    expect(rs.addrs.has(addr + 3)).toBe(false);
  });

  test('signed format uses floor(size/2) as word count', () => {
    const rs = new RegSpace();
    const reg = makeReg({ topic: 'test', format: 'signed', size: 4 });
    rs.append(reg, true);
    const addr = reg.address | (reg.unitId << 16);
    expect(rs.addrs.has(addr)).toBe(true);
    expect(rs.addrs.has(addr + 1)).toBe(true);
    expect(rs.addrs.has(addr + 2)).toBe(false);
  });

  test('size <= 0 defaults to 1 word', () => {
    const rs = new RegSpace();
    const reg = makeReg({ topic: 'test', format: 'signed', size: 0 });
    rs.append(reg, true);
    expect(rs.addrs.size).toBe(1);
  });

  test('same topic produces deterministic hash', () => {
    const rs1 = new RegSpace();
    const rs2 = new RegSpace();
    const reg1 = makeReg({ topic: 'same-topic' });
    const reg2 = makeReg({ topic: 'same-topic' });
    rs1.append(reg1, true);
    rs2.append(reg2, true);
    expect(reg1.address).toBe(reg2.address);
    expect(reg1.unitId).toBe(reg2.unitId);
  });

  test('empty topic returns hash 0', () => {
    const rs = new RegSpace();
    const reg = makeReg({ topic: '' });
    rs.append(reg, true);
    expect(rs.addrs.size).toBe(1);
  });
});
