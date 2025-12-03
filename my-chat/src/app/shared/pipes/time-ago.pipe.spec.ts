import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  beforeEach(() => {
    pipe = new TimeAgoPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "ahora" for recent dates', () => {
    const now = new Date();
    expect(pipe.transform(now)).toBe('ahora');
  });

  it('should return minutes for dates within an hour', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    expect(pipe.transform(date)).toBe('5m');
  });

  it('should return hours for dates within a day', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
    expect(pipe.transform(date)).toBe('3h');
  });

  it('should return days for dates within a week', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    expect(pipe.transform(date)).toBe('2d');
  });
});
